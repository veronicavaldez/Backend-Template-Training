import React, { useRef, useEffect, useState } from 'react';
import * as handPoseDetection from '@tensorflow-models/hand-pose-detection';
import '@tensorflow/tfjs-core';
import '@tensorflow/tfjs-backend-webgl';

function HandGestureDetector({ onGestureDetected }) {
  const videoRef = useRef(null);
  const [detector, setDetector] = useState(null);
  
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
      if (detector && videoRef.current) {
        try {
          const hands = await detector.estimateHands(videoRef.current);
          
          if (hands.length > 0) {
            // Process hand landmarks and detect gestures
            const gesture = processHandGesture(hands[0]);
            if (gesture) {
              onGestureDetected(gesture);
            }
          }
        } catch (error) {
          console.error('Hand detection error:', error);
        }
        
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
    
    // Simple gesture detection logic
    // This is a placeholder - you'll want to implement more sophisticated gesture recognition
    
    // Example: Detect if fingers are spread out (for volume control)
    const thumbTip = landmarks[4];
    const indexTip = landmarks[8];
    const distance = Math.sqrt(
      Math.pow(thumbTip.x - indexTip.x, 2) + 
      Math.pow(thumbTip.y - indexTip.y, 2)
    );
    
    if (distance > 100) {
      return {
        type: 'volume',
        parameters: { value: distance / 200 } // Normalize to 0-1 range
      };
    }
    
    // Add more gesture detection logic here
    
    return null;
  }
  
  return (
    <div>
      <video 
        ref={videoRef}
        style={{ 
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