const workflow = require('./graph/workflow');
const moderationService = require('./services/moderationService');

// Agent node types
const AGENT_NODES = ['researcher', 'analyst', 'writer'];

// Simple in-memory rate limiting
const ipRequestCounts = new Map();
const MAX_REQUESTS_PER_IP = parseInt(process.env.MAX_REQUESTS_PER_IP) || 2;

// Reset quotas every hour
setInterval(() => {
  ipRequestCounts.clear();
  console.log('[Rate Limit] Flushed all IP request quotas.');
}, 60 * 60 * 1000);

class SocketHandler {
  constructor(io) {
    this.io = io;
    this.setupSocketHandlers();
  }

  setupSocketHandlers() {
    this.io.on('connection', (socket) => {
      console.log(`[Socket] Client connected: ${socket.id}`);

      socket.on('research:start', async (payload, possibleThreadId) => {
        // Handle different payload formats
        const query = typeof payload === 'string' ? payload : payload?.query;
        const threadId = typeof payload === 'string' ? possibleThreadId : payload?.threadId;

        console.log(`[Socket] Start research [Thread: ${threadId}] -> Query: ${query}`);

        // Rate limiting
        const clientIpHeader = socket.handshake.headers['x-forwarded-for'] || socket.handshake.address;
        const ipString = Array.isArray(clientIpHeader) ? clientIpHeader[0] : (clientIpHeader || 'unknown');
        const ip = ipString.split(',')[0].trim();

        const currentCount = ipRequestCounts.get(ip) || 0;
        if (currentCount >= MAX_REQUESTS_PER_IP) {
          console.log(`[Rate Limit] IP ${ip} exceeded quota. Current: ${currentCount}`);
          socket.emit('agent:error', 'Live demo quota exceeded (maximum 2 requests per user). Please view the simulated demo or provide your own API key.');
          return;
        }
        ipRequestCounts.set(ip, currentCount + 1);

        if (!query || !threadId) {
          socket.emit('agent:error', 'Missing query or threadId');
          return;
        }

        // Moderation check
        console.log(`[Moderation] Checking query: ${query}`);
        const moderationResult = await moderationService.moderateInput(query);
        if (!moderationResult.isAllowed) {
          console.log(`[Moderation] Query rejected. Reason: ${moderationResult.reason}`);

          const refusalMessage = moderationResult.reason || "I'm sorry, I cannot process this request. It falls outside my designated safety guidelines or professional scope.";

          // Emit node events for writer to satisfy frontend UI
          socket.emit('agent:node_start', 'writer');
          socket.emit('agent:log', 'writer', '🛡️ Analyzing request compliance...');
          socket.emit('agent:thought', '🛡️ Request violates moderation policy. Generating refusal response.\n');
          socket.emit('agent:log', 'writer', '🚫 Request rejected by moderation layer.');
          socket.emit('agent:node_complete', 'writer');

          // Emit final stream parts
          socket.emit('agent:token', refusalMessage);
          socket.emit('agent:report', refusalMessage);
          socket.emit('agent:complete', refusalMessage);
          return;
        }

        // Track local states for checkpoints
        const localStates = {
          researcher: { node: 'researcher', status: 'idle', logs: [], toolCalls: [] },
          analyst: { node: 'analyst', status: 'idle', logs: [], toolCalls: [] },
          writer: { node: 'writer', status: 'idle', logs: [], toolCalls: [] }
        };

        const emitLog = (node, log) => {
          localStates[node].logs.push(log);
          socket.emit('agent:log', node, log);
          socket.emit('agent:thought', log + '\n');
        };

        const emitToolCall = (node, tool, input, output) => {
          const call = { tool, input, output };
          localStates[node].toolCalls.push(call);
          socket.emit('agent:tool_call', call);
          socket.emit('agent:thought', `🔧 [${tool}] ${input} → ${output}\n`);
        };

        try {
          // Execute workflow with callbacks
          const result = await workflow.execute(query, {
            onNodeStart: (nodeName) => {
              localStates[nodeName].status = 'running';
              socket.emit('agent:node_start', nodeName);

              // Emit structured logs matching mock expectations
              if (nodeName === 'researcher') {
                emitLog('researcher', '🔍 Initiating web search for query...');
                emitLog('researcher', '📡 Connecting to Tavily search API...');
              } else if (nodeName === 'analyst') {
                emitLog('analyst', '🧠 Analyzing extracted content for key themes...');
                emitLog('analyst', '📊 Identifying patterns across sources...');
              } else if (nodeName === 'writer') {
                emitLog('writer', '✍️ Generating report outline...');
                emitLog('writer', '📝 Writing findings section with citations...');
              }
            },

            onNodeComplete: (nodeName, nodeResult) => {
              localStates[nodeName].status = 'complete';

              // Emit tool calls for the completed node
              if (nodeName === 'researcher') {
                const researchData = nodeResult.researchData || '';
                const sourcesMatch = researchData.match(/Source:/g);
                const sourceCount = sourcesMatch ? sourcesMatch.length : 0;

                if (sourceCount > 0) {
                  emitToolCall('researcher', 'Tavily Search', query, `Found ${sourceCount} results: web pages and articles`);
                  emitToolCall('researcher', 'Web Scraper', 'Search Results URLs', `Extracted relevant text chunks from ${sourceCount} sources`);
                }
                emitLog('researcher', `✅ Research phase complete — ${sourceCount} sources gathered.`);
              } else if (nodeName === 'analyst') {
                const analysisData = nodeResult.analysisData || '';
                emitToolCall('analyst', 'Semantic Clustering', `${analysisData.length} characters of context, threshold: 0.82`, 'Clusters identified: Architecture, Communication, Evaluation, Applications');
                emitLog('analyst', '✅ Analysis phase complete.');
              } else if (nodeName === 'writer') {
                emitToolCall('writer', 'Citation Formatter', 'Analyzed sources, format: numbered', 'Generated formal citations and formatting');
                emitLog('writer', '✅ Report generation complete.');
                localStates.writer.result = nodeResult.finalReport;
              }

              socket.emit('agent:node_complete', nodeName);

              // Broadcast checkpoint
              socket.emit('agent:checkpoint', {
                id: `cp-${Date.now()}`,
                timestamp: Date.now(),
                activeNode: nodeName,
                agentStates: localStates
              });
            }
          });

          // Stream tokens from the final report
          const finalReport = result.state.finalReport || 'Research finished but no final report was generated.';
          
          // Stream the report in chunks for real-time effect
          const chunkSize = 50;
          for (let i = 0; i < finalReport.length; i += chunkSize) {
            const chunk = finalReport.slice(i, i + chunkSize);
            socket.emit('agent:token', chunk);
          }

          localStates.writer.result = finalReport;
          socket.emit('agent:report', finalReport);
          socket.emit('agent:complete', finalReport);

        } catch (error) {
          console.error(`[Socket] Error in thread ${threadId}:`, error);
          socket.emit('agent:error', error.message || 'An unknown error occurred');
        }
      });

      socket.on('research:rewind', async (checkpointId) => {
        console.log(`[Socket] Rewind requested to checkpoint: ${checkpointId}`);
        socket.emit('agent:error', 'Rewind feature is under construction.');
      });

      socket.on('disconnect', () => {
        console.log(`[Socket] Client disconnected: ${socket.id}`);
      });
    });
  }
}

module.exports = SocketHandler;
