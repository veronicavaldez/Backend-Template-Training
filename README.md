# Imogine

![alt text](https://shpeuf.s3.amazonaws.com/public/misc/logo_horizontal.png "SHPE logo")


## Project Name & Summary
Imogine is an innovative AI-powered music creation app that lets you compose and modify songs in real-time using just your hands. Leveraging computer vision and hand tracking, Imogine transforms your gestures into pitch adjustments, harmonies, and vocal effects—allowing you to intuitively shape sound like an instrument. Whether you’re a musician, producer, or just someone who loves experimenting with music, Imogine turns creativity into an immersive, hands-free experience.

## Target User
### Intended Audience
Imogine is designed for musicians, producers, digital artists, and creative tech enthusiasts, as well as students and educators interested in exploring the intersection of music and AI. It also appeals to accessibility advocates looking for new ways to make music production more inclusive through gesture-based interaction.

### User Needs Addressed
	•	Accessibility & Inclusivity – Provides an intuitive, hands-free way to create music, making it easier for users with mobility impairments or those unfamiliar with traditional instruments.
	•	Innovation & Creativity – Allows musicians and producers to experiment with unique, AI-enhanced sounds using body movements instead of traditional controls.
	•	Simplicity & Engagement – Removes the complexity of DAWs (Digital Audio Workstations) by offering a playful, real-time way to manipulate pitch, harmonies, and effects through hand gestures.
	•	Educational Value – Introduces students and tech enthusiasts to the world of AI-driven music production, computer vision, and gesture-based interfaces in an interactive way.

## Purpose & Problem Statement
### Solution & Usefulness
Imogine redefines how we create and interact with music by eliminating the barriers of traditional instruments and complex production software. Many aspiring artists struggle with expensive equipment, technical know-how, or physical limitations that prevent them from expressing their creativity. By using hand gestures to manipulate pitch, harmonies, and effects in real time, Imogine provides an intuitive and accessible way to compose music—perfect for musicians, producers, and anyone who wants to explore sound in a completely new way.
### Superpower
If Imogine were a superhero, its superpower would be “Gesture-to-Melody Alchemy”—the ability to transform simple hand movements into  musical compositions, empowering anyone to become a music creator with just a wave of their hand! 

## Core Features
### Hand Gesture-Based Music Control (Computer Vision + React + TensorFlow.js)
	•	Uses AI-powered hand tracking to recognize different gestures, allowing users to manipulate pitch, add harmonies, and apply vocal effects in real-time.
### AI-Powered Sound Modulation (Python + PyTorch + ONNX + Flask)
	•	Leverages machine learning models to analyze vocal input and dynamically adjust pitch, tone, and harmonics based on recognized gestures.
### Real-Time Audio Processing with GraphQL API (Node.js + Express + WebSockets)
	•	A GraphQL-powered backend enables low-latency real-time interactions, ensuring seamless gesture-to-audio response and cloud-based music modifications.
### Cloud Storage & Song History (MongoDB + Firebase + Azure)
	•	Saves user-generated compositions in the cloud, allowing musicians to access, remix, and share their gesture-driven music across devices.
### Intuitive Web-Based Interface (React + Electron.js for Desktop App)
	•	A sleek, interactive UI that visualizes hand tracking, pitch changes, and real-time audio effects, making the creative process immersive and easy to navigate.


## Technical Overview
### Frontend (React) ↔ Backend (Express + Node.js + GraphQL API)
- The React frontend communicates with the backend via a GraphQL API, allowing users to send queries and mutations related to song modifications, audio effects, and stored compositions.
- WebSockets (via Apollo GraphQL Subscriptions) enable real-time gesture recognition feedback and music processing.

### Backend (Node.js + Express + Flask ML Service) ↔ Database (MongoDB)
- The GraphQL API on Express handles requests from the frontend and interacts with MongoDB to store user compositions, settings, and song data.
-The Flask-based AI module (running PyTorch/ONNX) processes audio and gesture data, returning modified sound waveforms or pitch/harmony effects back to the Node.js server.

### Backend ↔ Computer Vision Hand Tracking
The hand tracking model (TensorFlow.js) runs on the frontend for real-time gesture detection. Processed gesture data is sent via GraphQL mutations to the backend for sound processing.

### Third Party APIs & Tools
- TensorFlow.js / MediaPipe Hands API – For real-time hand tracking in the browser.
- Web Audio API – For manipulating audio output directly in the frontend.
- Firebase / Cloudinary – To store audio files for user compositions.
- Azure Functions / AWS Lambda – To handle heavy AI processing tasks in a serverless manner if needed.














### index.js ###

The index.js file is the entry point of your backend application. It brings together all the key components of your GraphQL server, connects to your MongoDB database, and starts the server.

**Purpose:**

### config.js ###
This file is used to connect to the mongodb. not much to see here. watch video!

### models folder

#### TypeName.js

The files in the model folder look extremely similar to the definitions already established on TypeDefs.js, so this part is pretty straightforward.

```
const { model, Schema } = require('mongoose');

const artistSchema = new Schema({
    name: String,
    genre: String
});

module.exports = model('Artist', artistSchema);
```

