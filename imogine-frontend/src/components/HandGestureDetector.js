import React, { useRef, useEffect, useState } from 'react';
import * as handPoseDetection from '@tensorflow-models/hand-pose-detection';
import '@tensorflow/tfjs-core';
import '@tensorflow/tfjs-backend-webgl';

function HandGestureDetector({ onGestureDetected }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [detector, setDetector] = useState(null);
  const [prevWristX, setPrevWristX] = useState(0);
  
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
          
          // Draw landmarks on canvas
          const ctx = canvas.getContext('2d');
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          
          if (hands.length > 0) {
            // Scale coordinates to match canvas size
            const scaleX = canvas.width / video.videoWidth;
            const scaleY = canvas.height / video.videoHeight;
            
            // Draw hand landmarks with scaling
            drawHand(hands[0], ctx, scaleX, scaleY);
            
            // Process hand landmarks and detect gestures
            const gesture = processHandGesture(hands[0]);
            if (gesture) {
              onGestureDetected(gesture);
            }
            
            // Update previous wrist position for movement tracking
            setPrevWristX(hands[0].keypoints[0].x);
          }
        } catch (error) {
          console.error('Hand detection error:', error);
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
  
  function processHandGesture(hand) {
    const landmarks = hand.keypoints;
    
    // Get key finger positions
    const wrist = landmarks[0];
    const thumbTip = landmarks[4];
    const indexTip = landmarks[8];
    const middleTip = landmarks[12];
    const ringTip = landmarks[16];
    const pinkyTip = landmarks[20];
    
    // Count extended fingers (fingers that are raised)
    const extendedFingers = countExtendedFingers(landmarks);
    
    // Harmony gesture - 2 fingers extended (for one harmony a third below)
    if (extendedFingers === 2 && 
        isFingerExtended(landmarks, 'index') && 
        isFingerExtended(landmarks, 'middle')) {
      return {
        type: 'harmony',
        parameters: { 
          intervals: [-4], // Third below
          strength: 0.7 
        }
      };
    }
    
    // Harmony gesture - 3 fingers extended (for harmonies both above and below)
    if (extendedFingers === 3 && 
        isFingerExtended(landmarks, 'index') && 
        isFingerExtended(landmarks, 'middle') &&
        isFingerExtended(landmarks, 'ring')) {
      return {
        type: 'harmony',
        parameters: { 
          intervals: [-4, 4], // Third below and third above
          strength: 0.7 
        }
      };
    }
    
    return null;
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
    <div style={{ position: 'relative' }}>
      <video 
        ref={videoRef}
        style={{ 
          transform: 'scaleX(-1)',
          width: '320px',
          height: '240px',
          borderRadius: '8px'
        }}
      />
      <canvas
        ref={canvasRef}
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          transform: 'scaleX(-1)',
          width: '320px',
          height: '240px',
          borderRadius: '8px'
        }}
      />
    </div>
  );
}

export default HandGestureDetector;