import React, { useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMutation, useSubscription } from '@apollo/client';
import styled from 'styled-components';
import HandGestureDetector from '../components/HandGestureDetector';
import { 
  APPLY_GESTURE_EFFECT, 
  END_SESSION, 
  EFFECT_APPLIED_SUBSCRIPTION 
} from '../graphql/operations';

const SessionContainer = styled.div`
  display: grid;
  grid-template-columns: 1fr 2fr;
  height: 100vh;
  background-color: #1e1e2f;
  color: white;
`;

const ControlPanel = styled.div`
  padding: 2rem;
  background-color: #27293d;
  display: flex;
  flex-direction: column;
  align-items: center;
`;

const Visualizer = styled.div`
  padding: 2rem;
  display: flex;
  flex-direction: column;
  align-items: center;
`;

const EndButton = styled.button`
  margin-top: 2rem;
  padding: 0.8rem 1.5rem;
  background-color: #f44336;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  
  &:hover {
    background-color: #d32f2f;
  }
`;

const EffectsList = styled.div`
  margin-top: 2rem;
  width: 100%;
  max-height: 300px;
  overflow-y: auto;
`;

const EffectItem = styled.div`
  padding: 0.8rem;
  margin-bottom: 0.5rem;
  background-color: #32334a;
  border-radius: 4px;
`;

function SessionPage() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const audioContextRef = useRef(null);
  const audioSourceRef = useRef(null);
  
  const [applyEffect] = useMutation(APPLY_GESTURE_EFFECT);
  const [endSession] = useMutation(END_SESSION);
  
  const { data: subscriptionData } = useSubscription(EFFECT_APPLIED_SUBSCRIPTION, {
    variables: { sessionId }
  });
  
  useEffect(() => {
    // Initialize audio context
    const initAudio = async () => {
      try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        audioContextRef.current = new AudioContext();
        
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        audioSourceRef.current = audioContextRef.current.createMediaStreamSource(stream);
        
        // Connect to audio output
        audioSourceRef.current.connect(audioContextRef.current.destination);
      } catch (error) {
        console.error('Error initializing audio:', error);
      }
    };
    
    initAudio();
    
    return () => {
      // Cleanup audio context
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);
  
  useEffect(() => {
    if (subscriptionData && subscriptionData.effectApplied) {
      const effect = subscriptionData.effectApplied;
      console.log('Effect applied:', effect);
      
      // Apply audio effect based on the received data
      applyAudioEffect(effect.type, effect.parameters);
    }
  }, [subscriptionData]);
  
  const handleGestureDetected = async (gesture) => {
    try {
      await applyEffect({
        variables: {
          sessionId,
          type: gesture.type,
          parameters: gesture.parameters
        }
      });
    } catch (error) {
      console.error('Error applying effect:', error);
    }
  };
  
  const handleEndSession = async () => {
    try {
      await endSession({ variables: { sessionId } });
      navigate('/');
    } catch (error) {
      console.error('Error ending session:', error);
    }
  };
  
  const applyAudioEffect = (type, parameters) => {
    if (!audioContextRef.current || !audioSourceRef.current) return;
    
    // This is a placeholder - you'll want to implement actual audio effects
    console.log(`Applying ${type} effect with parameters:`, parameters);
    
    // Example implementation for volume effect
    if (type === 'volume' && parameters.value !== undefined) {
      const gainNode = audioContextRef.current.createGain();
      gainNode.gain.value = parameters.value;
      
      audioSourceRef.current.disconnect();
      audioSourceRef.current.connect(gainNode);
      gainNode.connect(audioContextRef.current.destination);
    }
    
    // Add more effect implementations here
  };
  
  return (
    <SessionContainer>
      <ControlPanel>
        <h2>Session Controls</h2>
        <HandGestureDetector onGestureDetected={handleGestureDetected} />
        <EndButton onClick={handleEndSession}>End Session</EndButton>
      </ControlPanel>
      
      <Visualizer>
        <h2>Audio Visualizer</h2>
        <canvas id="visualizer" width="600" height="300" />
        
        <EffectsList>
          <h3>Applied Effects</h3>
          {subscriptionData?.effectApplied && (
            <EffectItem>
              <p><strong>Type:</strong> {subscriptionData.effectApplied.type}</p>
              <p><strong>Parameters:</strong> {JSON.stringify(subscriptionData.effectApplied.parameters)}</p>
              <p><strong>Time:</strong> {new Date(subscriptionData.effectApplied.timestamp).toLocaleTimeString()}</p>
            </EffectItem>
          )}
        </EffectsList>
      </Visualizer>
    </SessionContainer>
  );
}

export default SessionPage;