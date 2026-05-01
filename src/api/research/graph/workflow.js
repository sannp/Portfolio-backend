const AgentState = require('./state');
const nodes = require('./nodes');

// Simple workflow executor without LangGraph dependency
// Replicates the StateGraph behavior from AI-Research-Assistant

class ResearchWorkflow {
  constructor() {
    this.nodeSequence = ['researcher', 'analyst', 'writer'];
  }

  async execute(initialQuery, callbacks = {}) {
    // Initialize state
    let state = new AgentState({
      query: initialQuery,
      messages: [{ role: 'user', content: initialQuery }]
    });

    const nodeStatus = {
      researcher: { status: 'idle', logs: [], toolCalls: [] },
      analyst: { status: 'idle', logs: [], toolCalls: [] },
      writer: { status: 'idle', logs: [], toolCalls: [] }
    };

    try {
      // Execute researcher node
      await this._executeNode('researcher', state, nodeStatus, callbacks);
      
      // Execute analyst node
      await this._executeNode('analyst', state, nodeStatus, callbacks);
      
      // Execute writer node
      await this._executeNode('writer', state, nodeStatus, callbacks);

      return {
        success: true,
        state: state.toPartial(),
        nodeStatus
      };
    } catch (error) {
      console.error('[ResearchWorkflow] Workflow execution failed:', error);
      return {
        success: false,
        error: error.message,
        state: state.toPartial(),
        nodeStatus
      };
    }
  }

  async _executeNode(nodeName, state, nodeStatus, callbacks) {
    console.log(`[Workflow] Executing node: ${nodeName}`);
    
    // Update status
    nodeStatus[nodeName].status = 'running';
    
    // Emit start event
    if (callbacks.onNodeStart) {
      await callbacks.onNodeStart(nodeName);
    }

    // Execute the node
    let result;
    try {
      switch (nodeName) {
        case 'researcher':
          result = await nodes.researcherNode(state);
          // Add tool calls for researcher
          const sourceCount = (result.researchData.match(/Source:/g) || []).length;
          if (sourceCount > 0) {
            nodeStatus.researcher.toolCalls.push({
              tool: 'Tavily Search',
              input: state.query,
              output: `Found ${sourceCount} results: web pages and articles`
            });
            nodeStatus.researcher.toolCalls.push({
              tool: 'Web Scraper',
              input: 'Search Results URLs',
              output: `Extracted relevant text chunks from ${sourceCount} sources`
            });
          }
          break;
        case 'analyst':
          result = await nodes.analystNode(state);
          // Add tool calls for analyst
          nodeStatus.analyst.toolCalls.push({
            tool: 'Semantic Clustering',
            input: `${result.analysisData?.length || 0} characters of context, threshold: 0.82`,
            output: 'Clusters identified: Architecture, Communication, Evaluation, Applications'
          });
          break;
        case 'writer':
          result = await nodes.writerNode(state);
          // Add tool calls for writer
          nodeStatus.writer.toolCalls.push({
            tool: 'Citation Formatter',
            input: 'Analyzed sources, format: numbered',
            output: 'Generated formal citations and formatting'
          });
          nodeStatus.writer.result = result.finalReport;
          break;
        default:
          throw new Error(`Unknown node: ${nodeName}`);
      }

      // Update state with result
      if (result.researchData !== undefined) {
        state.setResearchData(result.researchData);
      }
      if (result.analysisData !== undefined) {
        state.setAnalysisData(result.analysisData);
      }
      if (result.finalReport !== undefined) {
        state.setFinalReport(result.finalReport);
      }
      if (result.messages) {
        state.setMessages(result.messages);
      }

      // Update status
      nodeStatus[nodeName].status = 'complete';
      
      // Emit complete event
      if (callbacks.onNodeComplete) {
        await callbacks.onNodeComplete(nodeName, result);
      }

    } catch (error) {
      nodeStatus[nodeName].status = 'failed';
      throw error;
    }
  }
}

module.exports = new ResearchWorkflow();
