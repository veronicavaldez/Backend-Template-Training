const axios = require('axios');
const { startServer } = require('../index');
const mongoose = require('mongoose');
let server;

const GRAPHQL_ENDPOINT = 'http://localhost:4000/graphql';

async function testSetup() {
  try {
    // Test Flask Service Health
    const flaskHealth = await axios.get('http://localhost:5000/health');
    console.log('Flask Service Health:', flaskHealth.data);

    // Test GraphQL Session Creation
    const createSessionResponse = await axios.post(GRAPHQL_ENDPOINT, {
      query: `
        mutation {
          startSession {
            id
            userId
            isActive
            startedAt
          }
        }
      `
    });
    console.log('Session Created:', createSessionResponse.data);

    // Test Gesture Effect
    const sessionId = createSessionResponse.data.data.startSession.id;
    const effectResponse = await axios.post(GRAPHQL_ENDPOINT, {
      query: `
        mutation {
          applyGestureEffect(
            sessionId: "${sessionId}",
            type: "pitch",
            parameters: { value: 1.5 }
          ) {
            id
            type
            parameters
            timestamp
          }
        }
      `
    });
    console.log('Effect Applied:', effectResponse.data);

  } catch (error) {
    console.error('Test Failed:', error.message);
  }
}

async function runTests() {
  try {
    // Start the server
    server = await startServer();
    
    // Run the tests
    await testSetup();
  } catch (error) {
    console.error('Test Failed:', error);
  } finally {
    // Cleanup
    if (server) {
      await server.stop();
    }
    await mongoose.disconnect();
  }
}

// Run everything
runTests();
