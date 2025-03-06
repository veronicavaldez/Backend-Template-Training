const axios = require('axios');

class MLService {
  constructor() {
    this.baseURL = process.env.FLASK_ML_SERVICE_URL;
  }

  async healthCheck() {
    try {
      const response = await axios.get(`${this.baseURL}/health`);
      return response.data.status === "healthy";
    } catch (error) {
      console.error('ML Service health check failed:', error);
      return false;
    }
  }

  async processGesture(gestureData) {
    // For now, just pass through the data
    // Later this will integrate with actual ML models
    try {
      const response = await axios.post(`${this.baseURL}/process-gesture`, gestureData);
      return response.data;
    } catch (error) {
      throw new Error('ML Service processing failed');
    }
  }
}

module.exports = new MLService();
