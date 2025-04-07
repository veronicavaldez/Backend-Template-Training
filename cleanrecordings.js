// Command-line script to clean database
// Save as cleanRecordings.js
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const AudioSession = require('./models/AudioSession');

dotenv.config();

async function cleanDatabase() {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    console.log('Connected to MongoDB');
    
    const result = await AudioSession.updateMany(
      { recordingPath: { $exists: true } },
      { $unset: { recordingPath: "" } }
    );
    
    console.log(`Removed recording paths from ${result.modifiedCount} sessions`);
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

cleanDatabase();