'use client';

/**
 * AI Service — calls the server-side /api/chat route (OpenAI GPT-4o).
 * Falls back to keyword-matched scripted responses if the API call fails.
 */

const SCRIPTED_RESPONSES = {
  hello: "Hello! I'm your training avatar. I'm here to help you learn. Feel free to ask me anything about the training material!",
  help: "I can help you with the training modules. You can ask me to explain concepts, repeat lessons, or test your knowledge with quizzes.",
  repeat: "Sure! Let me go over that topic again for you.",
  quiz: "Great idea! Let me prepare a quiz question for you based on what we've covered.",
  explain: "Of course! Let me break that down in a simpler way for you.",
  safety: "Workplace safety is crucial. It includes understanding emergency procedures, using personal protective equipment, and identifying potential hazards in your work environment.",
  privacy: "Data privacy involves protecting personal information from unauthorized access. Key principles include data minimization, consent, and transparency.",
  customer: "Excellent customer service starts with active listening, empathy, and a genuine desire to solve the customer's problem efficiently.",
  default: "That's a great question! Let me suggest reviewing the training materials for more information on this topic.",
};

class AIService {
  constructor() {
    this.history = [];
  }

  /**
   * Ask a question via the server-side GPT-4o API route.
   * @param {string} question - User's question
   * @param {string} context - Current lesson context (optional)
   * @returns {Promise<string>}
   */
  async askQuestion(question, context = '') {
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: question,
          context,
          history: this.history,
        }),
      });

      if (!response.ok) throw new Error('API request failed');

      const data = await response.json();
      const answer = data.answer;

      // Update history for multi-turn conversation
      this.history = [
        ...this.history,
        { role: 'user', content: question },
        { role: 'assistant', content: answer },
      ].slice(-20); // keep last 20 messages

      return answer;
    } catch (error) {
      console.error('AI Service error:', error);
      return this._getScriptedResponse(question);
    }
  }

  _getScriptedResponse(question) {
    const lowerQ = question.toLowerCase();
    for (const [keyword, response] of Object.entries(SCRIPTED_RESPONSES)) {
      if (keyword !== 'default' && lowerQ.includes(keyword)) return response;
    }
    return SCRIPTED_RESPONSES.default;
  }

  resetHistory() {
    this.history = [];
  }
}

// Singleton
let aiServiceInstance = null;

export function getAIService() {
  if (!aiServiceInstance) aiServiceInstance = new AIService();
  return aiServiceInstance;
}

export default AIService;
