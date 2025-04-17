/**
 * Main application entry point.
 * Sets up an Express server with Apollo Server (GraphQL), WebSocket support for subscriptions,
 * middleware for CORS, static file serving (recordings), and endpoints for file uploads
 * and cross-browser audio playback (with on-the-fly conversion for Safari).
 * Connects to MongoDB using Mongoose.
 */

//Need to npm install apollo-server

/*
const { ApolloServer }= require(' insert location-of-apollo-server file '); 
const { MONGODB } = require('./config.js') //We connected to MongoDB with the config file
const mongoose = require('mongoose'); mongoose is a JavaScript library that connects MongoDB to Node.js
const typeDefs = require('./graphql/TypeDefs');
const resolvers = require('./graphql/resolvers');
*/



/* Below is a ApolloServer constructor:

from documentation: 
- Returns an initialized ApolloServer instance.
- Takes an options object as a parameter.
*/


/*
EXAMPLE 

const server = new ApolloServer({
    typeDefs,
    resolvers,
    context: ({req}) => ({ req })
});

*/


/*

mongoose
  .connect(MONGODB, { useNewUrlParser: true })
  .then(() => {
    console.log('MongoDB Connected');
    return server.listen({ port: 5000 });
  })
  .then((res) => {
    console.log(`Server running at ${res.url}`);
  });

*/

const express = require('express');
const { ApolloServer } = require('apollo-server-express');
const { createServer } = require('http');
const { makeExecutableSchema } = require('@graphql-tools/schema');
const { WebSocketServer } = require('ws');
const { useServer } = require('graphql-ws/lib/use/ws');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const AudioSession = require('./models/AudioSession');
const ffmpeg = require('fluent-ffmpeg');

dotenv.config();

const typeDefs = require('./graphql/TypeDefs');
const resolvers = require('./graphql/resolvers');

// Set up storage for recordings
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, 'recordings');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    // Extract extension from form data
    const fileExtension = req.body.fileExtension || 'webm';
    
    // Generate safe filename 
    const timestamp = Date.now();
    const safeFilename = `session-${req.body.sessionId}-${timestamp}.${fileExtension}`;
    
    // Store web path for potential use in response/database
    file.webPath = `/recordings/${safeFilename}`;
    
    cb(null, safeFilename);
  }
});

// Set up multer with the storage configuration
const upload = multer({ storage });

/**
 * Initializes and starts the Express application, Apollo Server, WebSocket server,
 * and connects to MongoDB.
 * @returns {Promise<http.Server>} A promise that resolves with the started HTTP server instance.
 */
async function startServer() {
  const app = express();
  const httpServer = createServer(app);

  const schema = makeExecutableSchema({ typeDefs, resolvers });

  // Set up WebSocket server
  const wsServer = new WebSocketServer({
    server: httpServer,
    path: '/graphql',
  });

  const serverCleanup = useServer({ schema }, wsServer);

  const server = new ApolloServer({
    schema,
    plugins: [{
      async serverWillStart() {
        return {
          async drainServer() {
            // Proper cleanup for WebSocket server on shutdown
            await serverCleanup.dispose();
          },
        };
      },
    }],
  });

  await server.start();
  server.applyMiddleware({ app });

  // Add CORS middleware (apply before other routes)
  app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    next();
  });

  // Add recording upload endpoint
  app.post('/upload-recording', upload.single('audio'), async (req, res) => {
    try {
      // Log the request details for debugging
      console.log('Recording upload request:');
      console.log('- Session ID:', req.body.sessionId);
      console.log('- File type:', req.body.fileType);
      console.log('- File extension:', req.body.fileExtension);
      
      // Verify file was uploaded
      if (!req.file) {
        console.error('No file was uploaded');
        return res.status(400).json({
          success: false,
          message: 'No file was uploaded'
        });
      }
      
      // IMPORTANT: Make sure extension matches the content type
      const fileType = req.body.fileType || 'audio/webm';
      let fileExtension = req.body.fileExtension || 'webm';
      
      // Ensure extension matches the content type
      if (fileType.includes('mp4')) {
        fileExtension = 'mp4';
      } else if (fileType.includes('webm')) {
        fileExtension = 'webm';
      } else if (fileType.includes('ogg')) {
        fileExtension = 'ogg';
      }
      
      // Rename the file if the extension is incorrect
      const originalPath = req.file.path;
      const sessionId = req.body.sessionId || 'unknown';
      const timestamp = Date.now();
      const correctFilename = `session-${sessionId}-${timestamp}.${fileExtension}`;
      const correctPath = path.join(__dirname, 'recordings', correctFilename);
      
      // Rename the file to have the correct extension
      fs.renameSync(originalPath, correctPath);
      
      // Update the web path
      const webPath = `/recordings/${correctFilename}`;
      
      // Log file details with corrected path
      console.log('Corrected file details:');
      console.log('- Original path:', originalPath);
      console.log('- Corrected path:', correctPath);
      console.log('- Web path:', webPath);
      
      // Update session in database with the recording path
      const session = await AudioSession.findById(sessionId);
      if (session) {
        session.recordingPath = webPath;
        await session.save();
        console.log('Updated recording path in database for session:', sessionId);
      } else {
        console.warn('Session not found in database:', sessionId);
      }
      
      // Return success response with corrected path
      res.json({ 
        success: true, 
        message: 'Recording saved successfully',
        filePath: webPath,
        fileInfo: {
          name: correctFilename,
          type: fileType,
          extension: fileExtension,
          size: fs.statSync(correctPath).size
        }
      });
    } catch (error) {
      console.error('Error saving recording:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Error saving recording: ' + error.message
      });
    }
  });

  // Serve recordings statically from the recordings directory
  app.use('/recordings', express.static(path.join(__dirname, 'recordings')));

  // Enable CORS
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    next();
  });

  // Log all requests to recordings directory - add more detail
  app.use('/recordings', (req, res, next) => {
    console.log('Recording request path:', req.path);
    const fullPath = path.join(__dirname, 'recordings', req.path);
    console.log('Full filesystem path:', fullPath);
    console.log('File exists:', fs.existsSync(fullPath));
    
    if (fs.existsSync(fullPath)) {
      // Log file stats
      try {
        const stats = fs.statSync(fullPath);
        console.log('File size:', stats.size, 'bytes');
        console.log('File created:', stats.birthtime);
        console.log('File modified:', stats.mtime);
        
        // Check if file has content
        if (stats.size === 0) {
          console.warn('Warning: File exists but is empty');
        }
      } catch (e) {
        console.error('Error checking file stats:', e);
      }
    }
    
    next();
  });

  // Make sure recordings directory exists
  const recordingsDir = path.join(__dirname, 'recordings');
  if (!fs.existsSync(recordingsDir)) {
    console.log('Creating recordings directory');
    fs.mkdirSync(recordingsDir, { recursive: true });
  }

  // Update the MIME type handling middleware
  app.use('/recordings', (req, res, next) => {
    const path = req.path.toLowerCase();
    if (path.endsWith('.webm')) {
      res.setHeader('Content-Type', 'audio/webm');
    } else if (path.endsWith('.mp3')) {
      res.setHeader('Content-Type', 'audio/mp3');
    } else if (path.endsWith('.mp4')) {
      res.setHeader('Content-Type', 'audio/mp4');
    }
    next();
  });

  // Add this route for cross-browser audio playback
  app.get('/api/audio/:filename', async (req, res) => {
    try {
      const filename = req.params.filename;
      if (!filename) {
        return res.status(400).send('No filename provided');
      }
      
      // Security check to prevent directory traversal
      if (filename.includes('..') || filename.includes('/')) {
        return res.status(403).send('Invalid filename');
      }
      
      // Get browser info
      const userAgent = req.headers['user-agent'] || '';
      const isSafari = userAgent.includes('Safari') && !userAgent.includes('Chrome');
      
      // Get the extension from the requested file
      const originalExtension = path.extname(filename).toLowerCase();
      const filePath = path.join(__dirname, 'recordings', filename);
      
      // Check if file exists
      if (!fs.existsSync(filePath)) {
        return res.status(404).send('File not found');
      }
      
      // For WebM files requested by Safari, convert to MP4 on-the-fly
      if (isSafari && originalExtension === '.webm') {
        console.log('Safari requesting WebM file - converting to MP4');
        
        // Create a compatible filename for the converted file
        const mp4Filename = filename.replace('.webm', '.mp4');
        const mp4Path = path.join(__dirname, 'recordings', mp4Filename);
        
        // Check if we already have a converted version
        if (fs.existsSync(mp4Path)) {
          console.log('Using existing converted file:', mp4Path);
          return res.sendFile(mp4Path);
        }
        
        // Convert WebM to MP4 using ffmpeg
        console.log('Converting from', filePath, 'to', mp4Path);
        
        await new Promise((resolve, reject) => {
          ffmpeg(filePath)
            .outputFormat('mp4')
            .save(mp4Path)
            .on('end', resolve)
            .on('error', reject);
        });
        
        console.log('Conversion complete, sending file');
        // Explicitly set Content-Type for the converted MP4
        res.setHeader('Content-Type', 'audio/mp4');
        return res.sendFile(mp4Path);
      }
      
      // For other browsers or already compatible formats, just send the original file
      console.log('Sending original file:', filePath);
      
      // Explicitly set Content-Type based on the original file extension
      if (originalExtension === '.mp4') {
          res.setHeader('Content-Type', 'audio/mp4');
      } else if (originalExtension === '.mp3') {
          res.setHeader('Content-Type', 'audio/mpeg'); // Use audio/mpeg for mp3
      } else if (originalExtension === '.aac') {
          res.setHeader('Content-Type', 'audio/aac');
      } else if (originalExtension === '.ogg') {
          res.setHeader('Content-Type', 'audio/ogg');
      } else {
          // Default to webm or let sendFile guess, but webm is common
          res.setHeader('Content-Type', 'audio/webm');
      }
      
      return res.sendFile(filePath);
    } catch (error) {
      console.error('Error serving audio:', error);
      res.status(500).send('Error processing audio file');
    }
  });

  const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/imogine';
  
  mongoose.connect(MONGODB_URI)
    .then(() => console.log('MongoDB Connected'))
    .catch(err => console.error('MongoDB connection error:', err));

  const PORT = process.env.PORT || 4000;
  httpServer.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}${server.graphqlPath}`);
    console.log(`WebSocket server ready at ws://localhost:${PORT}${server.graphqlPath}`);
  });
  
  return httpServer;
}

startServer();

module.exports = { startServer };