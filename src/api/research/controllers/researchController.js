const workflow = require('../graph/workflow');
const moderationService = require('../services/moderationService');

// In-memory storage for research jobs (consider Redis for production)
const researchJobs = new Map();

class ResearchController {
  async startResearch(query, threadId) {
    console.log(`[ResearchController] Starting research [Thread: ${threadId}] -> Query: ${query}`);

    // Initialize job status
    researchJobs.set(threadId, {
      threadId,
      query,
      status: 'running',
      startedAt: new Date().toISOString(),
      completedAt: null,
      result: null,
      error: null,
      nodeStatus: {
        researcher: { status: 'idle', logs: [], toolCalls: [] },
        analyst: { status: 'idle', logs: [], toolCalls: [] },
        writer: { status: 'idle', logs: [], toolCalls: [] }
      }
    });

    try {
      // Moderation check
      const moderationResult = await moderationService.moderateInput(query);
      if (!moderationResult.isAllowed) {
        const refusalMessage = moderationResult.reason || "I'm sorry, I cannot process this request.";
        
        researchJobs.set(threadId, {
          ...researchJobs.get(threadId),
          status: 'rejected',
          completedAt: new Date().toISOString(),
          result: { finalReport: refusalMessage }
        });

        return { success: false, reason: 'moderation_rejected' };
      }

      // Execute workflow
      const result = await workflow.execute(query, {
        onNodeStart: (nodeName) => {
          const job = researchJobs.get(threadId);
          if (job) {
            job.nodeStatus[nodeName].status = 'running';
          }
        },
        onNodeComplete: (nodeName, nodeResult) => {
          const job = researchJobs.get(threadId);
          if (job) {
            job.nodeStatus[nodeName].status = 'complete';
          }
        }
      });

      // Update job with result
      const finalJob = researchJobs.get(threadId);
      if (finalJob) {
        finalJob.status = result.success ? 'completed' : 'failed';
        finalJob.completedAt = new Date().toISOString();
        finalJob.result = result.state;
        finalJob.error = result.error || null;
      }

      return { success: result.success, threadId };

    } catch (error) {
      console.error(`[ResearchController] Research failed [Thread: ${threadId}]:`, error);
      
      const job = researchJobs.get(threadId);
      if (job) {
        job.status = 'failed';
        job.completedAt = new Date().toISOString();
        job.error = error.message;
      }

      return { success: false, error: error.message };
    }
  }

  getStatus(threadId) {
    const job = researchJobs.get(threadId);
    if (!job) {
      return null;
    }

    return {
      threadId: job.threadId,
      status: job.status,
      query: job.query,
      startedAt: job.startedAt,
      completedAt: job.completedAt,
      nodeStatus: job.nodeStatus
    };
  }

  getResult(threadId) {
    const job = researchJobs.get(threadId);
    if (!job || job.status !== 'completed') {
      return null;
    }

    return {
      threadId: job.threadId,
      query: job.query,
      finalReport: job.result?.finalReport,
      researchData: job.result?.researchData,
      analysisData: job.result?.analysisData,
      completedAt: job.completedAt
    };
  }

  // Cleanup old jobs (call periodically)
  cleanup(maxAge = 24 * 60 * 60 * 1000) { // 24 hours default
    const now = Date.now();
    for (const [threadId, job] of researchJobs.entries()) {
      const jobTime = new Date(job.startedAt).getTime();
      if (now - jobTime > maxAge) {
        researchJobs.delete(threadId);
      }
    }
  }
}

// Auto-cleanup every hour
setInterval(() => {
  researchController.cleanup();
}, 60 * 60 * 1000);

const researchController = new ResearchController();
module.exports = researchController;
