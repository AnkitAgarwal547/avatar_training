'use client';

/**
 * AI Service — handles dynamic conversational Q&A
 * Falls back to keyword-matched scripted responses if no API key is provided.
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
  default: "That's a great question! In a full implementation, I would use AI to give you a detailed answer. For now, let me suggest reviewing the training materials for more information on this topic.",
};

class AIService {
  constructor() {
    this.apiKey = null;
  }

  /**
   * Set the API key for OpenAI
   */
  setApiKey(key) {
    this.apiKey = key;
  }

  /**
   * Ask a question — uses OpenAI if key is set, otherwise keyword match
   * @param {string} question - User's question
   * @param {string} context - Current lesson context
   * @returns {Promise<string>}
   */
  async askQuestion(question, context = '') {
    if (this.apiKey) {
      return this._askAI(question, context);
    }
    return this._getScriptedResponse(question);
  }

  async _askAI(question, context) {
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, context, apiKey: this.apiKey }),
      });

      if (!response.ok) {
        throw new Error('API request failed');
      }

      const data = await response.json();
      return data.answer;
    } catch (error) {
      console.error('AI Service error:', error);
      return this._getScriptedResponse(question);
    }
  }

  _getScriptedResponse(question) {
    const lowerQ = question.toLowerCase();
    for (const [keyword, response] of Object.entries(SCRIPTED_RESPONSES)) {
      if (keyword !== 'default' && lowerQ.includes(keyword)) {
        return response;
      }
    }
    return SCRIPTED_RESPONSES.default;
  }
}

// Singleton
let aiServiceInstance = null;

export function getAIService() {
  if (!aiServiceInstance) {
    aiServiceInstance = new AIService();
  }
  return aiServiceInstance;
}

export default AIService;
