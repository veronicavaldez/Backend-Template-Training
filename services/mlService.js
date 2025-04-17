/**
 * Service class for interacting with the external Flask ML service.
 * Handles health checks and gesture processing requests.
 */
const axios = require('axios');

/**
 * Provides methods to communicate with the ML processing backend.
 */
class MLService {
  /**
   * Initializes the service, setting the base URL for the ML service 
   * from environment variables.
   */
  constructor() {
    this.baseURL = process.env.FLASK_ML_SERVICE_URL; // e.g., http://localhost:5000
  }

  /**
   * Checks the health of the ML service.
   * @returns {Promise<boolean>} True if the service is healthy, false otherwise.
   */
  async healthCheck() {
    try {
      const response = await axios.get(`${this.baseURL}/health`);
      return response.data.status === "healthy";
    } catch (error) {
      console.error('ML Service health check failed:', error.message); // Log only the error message
      return false;
    }
  }

  /**
   * Sends gesture data to the ML service for processing.
   * Currently acts as a pass-through, but intended for future ML model integration.
   * @param {object} gestureData - The gesture data to process.
   * @returns {Promise<object>} The processed data or response from the ML service.
   * @throws {Error} If the ML service request fails.
   */
  async processGesture(gestureData) {
    // For now, just pass through the data
    // Later this will integrate with actual ML models
    if (!this.baseURL) {
        console.error('ML Service URL not configured. Set FLASK_ML_SERVICE_URL environment variable.');
        throw new Error('ML Service not configured');
    }
    try {
      const response = await axios.post(`${this.baseURL}/process-gesture`, gestureData);
      return response.data;
    } catch (error) {
      console.error('ML Service processing failed:', error.message);
      throw new Error(`ML Service processing failed: ${error.message}`); // Include original error message
    }
  }
}

// Export a singleton instance of the service
module.exports = new MLService();
