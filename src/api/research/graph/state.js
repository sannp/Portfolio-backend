// Defines the state structure for the research graph
// Ported from AI-Research-Assistant TypeScript state.ts

class AgentState {
  constructor(initialState = {}) {
    // The original research query
    this.query = initialState.query || '';
    
    // All messages in the thread
    this.messages = initialState.messages || [];
    
    // Temporary storage for agent outputs between nodes
    this.researchData = initialState.researchData || '';
    this.analysisData = initialState.analysisData || '';
    this.finalReport = initialState.finalReport || '';
  }

  // Reducer for messages (concatenates arrays)
  setMessages(newMessages) {
    this.messages = this.messages.concat(newMessages);
  }

  // Reducer for string fields (replace with new value or keep existing)
  setResearchData(data) {
    this.researchData = data ?? this.researchData;
  }

  setAnalysisData(data) {
    this.analysisData = data ?? this.analysisData;
  }

  setFinalReport(report) {
    this.finalReport = report ?? this.finalReport;
  }

  // Create a partial update object for merging
  toPartial() {
    return {
      query: this.query,
      messages: this.messages,
      researchData: this.researchData,
      analysisData: this.analysisData,
      finalReport: this.finalReport
    };
  }

  // Clone the current state
  clone() {
    return new AgentState({
      query: this.query,
      messages: [...this.messages],
      researchData: this.researchData,
      analysisData: this.analysisData,
      finalReport: this.finalReport
    });
  }
}

module.exports = AgentState;
