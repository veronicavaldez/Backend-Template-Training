import React, { useRef, useEffect, useState } from 'react';
import * as handPoseDetection from '@tensorflow-models/hand-pose-detection';
import '@tensorflow/tfjs-core';
import '@tensorflow/tfjs-backend-webgl';

// Define pitch zones (adjust as needed)
const PITCH_ZONES = 5; // e.g., 5 zones for pitch level

function HandGestureDetector({ onGestureDetected }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [detector, setDetector] = useState(null);
  const [prevWristX, setPrevWristX] = useState(0);
  const [currentPitchZone, setCurrentPitchZone] = useState(null); // State to track current zone
  
  useEffect(() => {
    async function setupCamera() {
      const video = videoRef.current;
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480 }
      });
      video.srcObject = stream;
      
      return new Promise((resolve) => {
        video.onloadedmetadata = () => {
          video.play();
          resolve(video);
        };
      });
    }
    
    async function loadModel() {
      const model = handPoseDetection.SupportedModels.MediaPipeHands;
      const detectorConfig = {
        runtime: 'mediapipe',
        solutionPath: 'https://cdn.jsdelivr.net/npm/@mediapipe/hands',
        modelType: 'full'
      };
      const detector = await handPoseDetection.createDetector(model, detectorConfig);
      setDetector(detector);
    }
    
    async function init() {
      await setupCamera();
      await loadModel();
    }
    
    init();
    
    return () => {
      // Cleanup
      const video = videoRef.current;
      if (video && video.srcObject) {
        video.srcObject.getTracks().forEach(track => track.stop());
      }
    };
  }, []);
  
  useEffect(() => {
    let animationFrameId;
    
    async function detectHands() {
      if (detector && videoRef.current && canvasRef.current) {
        try {
          // Update canvas dimensions to match video
          const video = videoRef.current;
          const canvas = canvasRef.current;
          
          // Set canvas size to match video display size
          canvas.width = video.clientWidth;
          canvas.height = video.clientHeight;
          
          const hands = await detector.estimateHands(video);
          
          // Draw landmarks and pitch markers on canvas
          const ctx = canvas.getContext('2d');
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          drawPitchMarkers(ctx, canvas.width, canvas.height); // Draw markers first
          
          if (hands.length > 0) {
            // Scale coordinates to match canvas size
            const scaleX = canvas.width / video.videoWidth;
            const scaleY = canvas.height / video.videoHeight;
            
            // Draw hand landmarks with scaling
            drawHand(hands[0], ctx, scaleX, scaleY);
            
            // Process hand landmarks and detect gestures
            const gesture = processHandGesture(hands[0], canvas.height); // Pass canvas height for normalization
            if (gesture) {
              onGestureDetected(gesture);
              // Update current pitch zone if pitch gesture detected
              if (gesture.type === 'pitch') {
                setCurrentPitchZone(gesture.parameters.zone); 
              }
            } else {
              setCurrentPitchZone(null); // Reset zone if no pitch gesture
            }
            
            // Update previous wrist position for movement tracking
            setPrevWristX(hands[0].keypoints[0].x);
          } else {
             setCurrentPitchZone(null); // Reset zone if no hand detected
          }
        } catch (error) {
          console.error('Hand detection error:', error);
           setCurrentPitchZone(null); // Reset on error
        }
        
        animationFrameId = requestAnimationFrame(detectHands);
      } else {
        animationFrameId = requestAnimationFrame(detectHands);
      }
    }
    
    if (detector) {
      detectHands();
    }
    
    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [detector, onGestureDetected]);
  
  // Function to draw horizontal pitch markers
  function drawPitchMarkers(ctx, width, height) {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)'; // Light, semi-transparent lines
    ctx.lineWidth = 1;
    ctx.font = '10px Arial';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';

    const zoneHeight = height / PITCH_ZONES;

    for (let i = 1; i < PITCH_ZONES; i++) {
      const y = zoneHeight * i;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
      // Optional: Label zones
      // ctx.fillText(`Zone ${PITCH_ZONES - i}`, 5, y - 5); 
    }
     // Highlight the current zone
     if (currentPitchZone !== null) {
        const zoneY = (PITCH_ZONES - 1 - currentPitchZone) * zoneHeight;
        ctx.fillStyle = 'rgba(79, 172, 254, 0.2)'; // Highlight color
        ctx.fillRect(0, zoneY, width, zoneHeight);
      }
  }
  
  function processHandGesture(hand, canvasHeight) { // Accept canvasHeight
    const landmarks = hand.keypoints;
    // Use landmark 9 (MIDDLE_FINGER_MCP) as the reference for palm height
    const palmCenter = landmarks[9]; 
    
    // --- Pitch Detection based on Wrist Height ---
    // Normalize Y coordinate (0 at bottom, 1 at top)
    const normalizedY = 1 - (palmCenter.y / canvasHeight); // Use palm center Y, invert Y-axis
    const clampedY = Math.max(0, Math.min(1, normalizedY)); // Clamp between 0 and 1

    // Determine pitch zone (0 to PITCH_ZONES - 1)
    const pitchZone = Math.min(PITCH_ZONES - 1, Math.floor(clampedY * PITCH_ZONES));

    // You could map pitchZone to actual pitch values (e.g., MIDI notes, frequency multipliers)
    // For now, we send the zone and the normalized value
    const pitchGesture = {
      type: 'pitch',
      parameters: { 
        level: clampedY, // Normalized value 0-1
        zone: pitchZone   // Discrete zone index
      }
    };
    // Always emit pitch if hand is detected for continuous control
    onGestureDetected(pitchGesture); 
    // Set current pitch zone for visualization feedback
    setCurrentPitchZone(pitchZone);


    // --- Harmony Gesture Detection (Existing Logic) ---
    const extendedFingers = countExtendedFingers(landmarks);
    
    if (extendedFingers === 2 && 
        isFingerExtended(landmarks, 'index') && 
        isFingerExtended(landmarks, 'middle')) {
      return { // Return harmony, overwriting pitch for this frame if needed
        type: 'harmony',
        parameters: { intervals: [-4], strength: 0.7 } 
      };
    }
    
    if (extendedFingers === 3 && 
        isFingerExtended(landmarks, 'index') && 
        isFingerExtended(landmarks, 'middle') &&
        isFingerExtended(landmarks, 'ring')) {
      return { // Return harmony
        type: 'harmony',
        parameters: { intervals: [-4, 4], strength: 0.7 } 
      };
    }
    
    // If no other specific gesture is detected, we let the previously called
    // onGestureDetected(pitchGesture) stand as the gesture for this frame.
    // If you *only* want pitch when NO other gesture is active, return pitchGesture here.
    // Example: return pitchGesture; 
    
    return null; // Return null if only pitch was detected (already sent) or no specific gesture matched
  }
  
  // Helper function to count extended fingers
  function countExtendedFingers(landmarks) {
    const wrist = landmarks[0];
    const fingerTips = [landmarks[4], landmarks[8], landmarks[12], landmarks[16], landmarks[20]];
    const fingerBases = [landmarks[2], landmarks[5], landmarks[9], landmarks[13], landmarks[17]];
    
    let count = 0;
    
    // For each finger
    for (let i = 0; i < 5; i++) {
      // Skip thumb (different calculation)
      if (i === 0) continue;
      
      // Check if finger is extended (tip is higher than base)
      if (fingerTips[i].y < fingerBases[i].y - 30) {
        count++;
      }
    }
    
    // Special check for thumb
    const thumbTip = landmarks[4];
    const thumbIp = landmarks[3];
    const thumbMcp = landmarks[2];
    
    // Thumb is extended if it's to the side of the hand
    if (thumbTip.x < thumbMcp.x - 30) {
      count++;
    }
    
    return count;
  }
  
  // Helper function to check if a specific finger is extended
  function isFingerExtended(landmarks, fingerName) {
    const fingerIndices = {
      'thumb': 0,
      'index': 1,
      'middle': 2,
      'ring': 3,
      'pinky': 4
    };
    
    const index = fingerIndices[fingerName];
    if (index === undefined) return false;
    
    const tipIndex = index === 0 ? 4 : index * 4 + 4;
    const baseIndex = index === 0 ? 2 : index * 4 + 1;
    
    const tip = landmarks[tipIndex];
    const base = landmarks[baseIndex];
    
    // For thumb
    if (index === 0) {
      return tip.x < base.x - 30;
    }
    
    // For other fingers
    return tip.y < base.y - 30;
  }
  
  function drawHand(hand, ctx, scaleX, scaleY) {
    // Draw connections between landmarks
    const landmarks = hand.keypoints;
    
    // Draw points
    for (let i = 0; i < landmarks.length; i++) {
      const x = landmarks[i].x * scaleX;
      const y = landmarks[i].y * scaleY;
      
      ctx.beginPath();
      ctx.arc(x, y, 5, 0, 2 * Math.PI);
      ctx.fillStyle = '#00FF00';
      ctx.fill();
    }
    
    // Draw connections (simplified)
    ctx.strokeStyle = '#00FF00';
    ctx.lineWidth = 2;
    
    // Connect thumb
    connectPoints(ctx, landmarks, 0, 1, scaleX, scaleY);
    connectPoints(ctx, landmarks, 1, 2, scaleX, scaleY);
    connectPoints(ctx, landmarks, 2, 3, scaleX, scaleY);
    connectPoints(ctx, landmarks, 3, 4, scaleX, scaleY);
    
    // Connect index finger
    connectPoints(ctx, landmarks, 0, 5, scaleX, scaleY);
    connectPoints(ctx, landmarks, 5, 6, scaleX, scaleY);
    connectPoints(ctx, landmarks, 6, 7, scaleX, scaleY);
    connectPoints(ctx, landmarks, 7, 8, scaleX, scaleY);
    
    // Connect middle finger
    connectPoints(ctx, landmarks, 0, 9, scaleX, scaleY);
    connectPoints(ctx, landmarks, 9, 10, scaleX, scaleY);
    connectPoints(ctx, landmarks, 10, 11, scaleX, scaleY);
    connectPoints(ctx, landmarks, 11, 12, scaleX, scaleY);
    
    // Connect ring finger
    connectPoints(ctx, landmarks, 0, 13, scaleX, scaleY);
    connectPoints(ctx, landmarks, 13, 14, scaleX, scaleY);
    connectPoints(ctx, landmarks, 14, 15, scaleX, scaleY);
    connectPoints(ctx, landmarks, 15, 16, scaleX, scaleY);
    
    // Connect pinky
    connectPoints(ctx, landmarks, 0, 17, scaleX, scaleY);
    connectPoints(ctx, landmarks, 17, 18, scaleX, scaleY);
    connectPoints(ctx, landmarks, 18, 19, scaleX, scaleY);
    connectPoints(ctx, landmarks, 19, 20, scaleX, scaleY);
    
    // Connect palm
    connectPoints(ctx, landmarks, 5, 9, scaleX, scaleY);
    connectPoints(ctx, landmarks, 9, 13, scaleX, scaleY);
    connectPoints(ctx, landmarks, 13, 17, scaleX, scaleY);
  }
  
  function connectPoints(ctx, landmarks, idx1, idx2, scaleX, scaleY) {
    ctx.beginPath();
    ctx.moveTo(landmarks[idx1].x * scaleX, landmarks[idx1].y * scaleY);
    ctx.lineTo(landmarks[idx2].x * scaleX, landmarks[idx2].y * scaleY);
    ctx.stroke();
  }
  
  return (
    <div style={{ position: 'relative', width: '320px', height: '240px' }}>
      <video 
        ref={videoRef}
        style={{ 
          transform: 'scaleX(-1)',
          width: '100%', // Use 100% to fill container
          height: '100%', // Use 100% to fill container
          borderRadius: '8px',
          display: 'block' // Prevents small gaps
        }}
      />
      <canvas
        ref={canvasRef}
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          transform: 'scaleX(-1)',
          width: '100%', // Match video size
          height: '100%', // Match video size
          borderRadius: '8px',
          pointerEvents: 'none' // Allow interaction with elements below if any
        }}
      />
    </div>
  );
}

export default HandGestureDetector;