import React, { useRef, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMutation, useSubscription, useApolloClient } from '@apollo/client';
import { APPLY_GESTURE_EFFECT, END_SESSION, GET_USER_SESSIONS } from '../graphql/operations';
import { EFFECT_APPLIED_SUBSCRIPTION } from '../graphql/operations';
import HandGestureDetector from '../components/HandGestureDetector';
import { 
  Container, 
  Grid, 
  Segment, 
  Header, 
  Button, 
  Icon, 
  Divider, 
  List, 
  Label,
  Message,
  Dimmer,
  Loader,
  Modal
} from 'semantic-ui-react';
import '../styles/SessionPage.css';
import { gql } from '@apollo/client';

function SessionPage() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const audioContextRef = useRef(null);
  const audioSourceRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);
  const [isRecording, setIsRecording] = useState(false);
  const [recordedAudio, setRecordedAudio] = useState(null);
  const canvasRef = useRef(null);
  const analyserRef = useRef(null);
  const streamRef = useRef(null);
  const [saveStatus, setSaveStatus] = useState(null);
  const [isEndingSession, setIsEndingSession] = useState(false);
  const [confirmEndOpen, setConfirmEndOpen] = useState(false);
  const [isPlayingRecording, setIsPlayingRecording] = useState(false);
  const [audioFormatInfo, setAudioFormatInfo] = useState({
    mimeType: 'audio/webm',
    extension: 'webm'
  });
  const [lastRecordingPath, setLastRecordingPath] = useState(null);
  
  const [applyEffect] = useMutation(APPLY_GESTURE_EFFECT);
  const [endSession] = useMutation(END_SESSION);
  
  const { data: subscriptionData } = useSubscription(EFFECT_APPLIED_SUBSCRIPTION, {
    variables: { sessionId }
  });
  
  const client = useApolloClient();
  
  useEffect(() => {
    const initAudio = async () => {
      try {
        // Initialize audio context
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        const audioContext = new AudioContext();
        audioContextRef.current = audioContext;
        
        // Get user media stream
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = stream;
        
        // Create audio source from stream
        const source = audioContext.createMediaStreamSource(stream);
        audioSourceRef.current = source;
        
        // Create analyser for visualization
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;
        source.connect(analyser);
        analyserRef.current = analyser;
        
        // Create a gain node set to zero volume and connect it to the destination
        const silentGain = audioContext.createGain();
        silentGain.gain.value = 0; // Set volume to zero
        analyser.connect(silentGain);
        silentGain.connect(audioContext.destination);
        
        // Enhanced browser and format detection
        const formatInfo = detectOptimalAudioFormat();
        console.log('Selected audio format:', formatInfo);
        
        // Store format info in state for later use
        setAudioFormatInfo(formatInfo);
        
        // Set up media recorder with the detected format
        mediaRecorderRef.current = new MediaRecorder(stream, { 
          mimeType: formatInfo.mimeType || undefined,
          audioBitsPerSecond: 128000 
        });
        
        mediaRecorderRef.current.ondataavailable = (event) => {
          if (event.data.size > 0) {
            recordedChunksRef.current.push(event.data);
          }
        };
        
        mediaRecorderRef.current.onstop = () => {
          if (recordedChunksRef.current.length > 0) {
            const blob = new Blob(recordedChunksRef.current, { 
              type: formatInfo.mimeType || 'audio/webm' 
            });
            const url = URL.createObjectURL(blob);
            setRecordedAudio(url);
          }
        };
        
        // Start visualization
        visualize();
      } catch (error) {
        console.error('Error initializing audio:', error);
      }
    };
    
    initAudio();
    
    // Clean up
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);
  
  const visualize = () => {
    if (!canvasRef.current || !analyserRef.current) return;
    
    const canvas = canvasRef.current;
    const canvasCtx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    const analyser = analyserRef.current;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    
    canvasCtx.clearRect(0, 0, width, height);
    
    const draw = () => {
      requestAnimationFrame(draw);
      
      analyser.getByteFrequencyData(dataArray);
      
      canvasCtx.fillStyle = 'rgb(0, 0, 0)';
      canvasCtx.fillRect(0, 0, width, height);
      
      const barWidth = (width / bufferLength) * 2.5;
      let barHeight;
      let x = 0;
      
      for (let i = 0; i < bufferLength; i++) {
        barHeight = dataArray[i] / 2;
        
        canvasCtx.fillStyle = `rgb(${barHeight + 100}, 50, 50)`;
        canvasCtx.fillRect(x, height - barHeight, barWidth, barHeight);
        
        x += barWidth + 1;
      }
    };
    
    draw();
  };
  
  const startRecording = () => {
    if (!mediaRecorderRef.current) return;
    
    // Reset recorded chunks
    recordedChunksRef.current = [];
    setRecordedAudio(null);
    
    // Start recording
    mediaRecorderRef.current.start();
    setIsRecording(true);
    console.log('Recording started');
  };
  
  const stopRecording = () => {
    if (!mediaRecorderRef.current || mediaRecorderRef.current.state === 'inactive') return;
    
    // Stop recording
    mediaRecorderRef.current.stop();
    setIsRecording(false);
    console.log('Recording stopped');
  };
  
  const playRecording = () => {
    if (!recordedAudio) return;
    
    setIsPlayingRecording(true);
    const audio = new Audio(recordedAudio);
    audio.onended = () => setIsPlayingRecording(false);
    audio.play();
  };
  
  const handleGestureDetected = (gesture) => {
    console.log('Gesture detected:', gesture);
    
    if (gesture && gesture.type && gesture.parameters) {
      applyAudioEffect(gesture.type, gesture.parameters);
      
      applyEffect({
        variables: {
          sessionId,
          type: gesture.type,
          parameters: gesture.parameters
        }
      }).catch(error => {
        console.error('Error applying effect:', error);
      });
    }
  };
  
  const handleEndSession = async () => {
    setConfirmEndOpen(false);
    setIsEndingSession(true);
    
    try {
      await endSession({
        variables: { sessionId }
      });
      
      navigate('/');
    } catch (error) {
      console.error('Error ending session:', error);
      setIsEndingSession(false);
    }
  };
  
  const applyAudioEffect = (type, parameters) => {
    if (!audioContextRef.current || !audioSourceRef.current) return;
    
    console.log(`Applying ${type} effect with parameters:`, parameters);
    
    // Create a gain node set to zero to prevent audio output
    const silentGain = audioContextRef.current.createGain();
    silentGain.gain.value = 0;
    
    // Here you would implement the actual audio effects
    if (type === 'volume') {
      const gainNode = audioContextRef.current.createGain();
      gainNode.gain.value = parameters.value;
      
      // Connect to the silent gain node instead of directly to destination
      audioSourceRef.current.connect(gainNode);
      gainNode.connect(silentGain);
      silentGain.connect(audioContextRef.current.destination);
    }
    
    // Add other effect types here, always connecting to silentGain instead of destination
  };
  
  
  const saveRecording = async () => {
    if (!recordedAudio) {
      console.error("No recorded audio available to save.");
      setSaveStatus('error');
      return; 
    }
  
    try {
      setSaveStatus('saving');
      
      // Fetch the blob from the recordedAudio state variable
      const response = await fetch(recordedAudio); 
      const blob = await response.blob();
      
      console.log('Recording blob details:', {
        type: blob.type,
        size: blob.size,
        detectedFormat: audioFormatInfo,
        sessionId: sessionId
      });
      
      // Create a FormData object to send the file
      const formData = new FormData();
      
      // IMPORTANT: Use the detected extension from the format detection
      const extension = audioFormatInfo.extension || 'webm';
      const filename = `session-${sessionId}-${Date.now()}.${extension}`;
      
      formData.append('audio', blob, filename);
      formData.append('sessionId', sessionId);
      formData.append('fileType', audioFormatInfo.mimeType || blob.type);
      formData.append('fileExtension', extension);
      formData.append('browserInfo', JSON.stringify({
        userAgent: navigator.userAgent,
        platform: navigator.platform
      }));
      
      // Send to backend
      const uploadResponse = await fetch('http://localhost:4000/upload-recording', {
        method: 'POST',
        body: formData,
      });
  
      const result = await uploadResponse.json();
      console.log('Recording saved:', result);
      
      if (result.success) {
        setSaveStatus('success');
        // Store the correct file path for later reference
        setLastRecordingPath(result.filePath);
        setTimeout(() => setSaveStatus(null), 5000);
      } else {
        setSaveStatus('error');
        console.error("Backend error saving recording:", result.message); 
      }
    } catch (error) {
      console.error('Error saving recording:', error);
      setSaveStatus('error');
    }
  };
  
  // Helper function to detect optimal audio format based on browser
  const detectOptimalAudioFormat = () => {
    // Detect browser
    const ua = navigator.userAgent.toLowerCase();
    const isChrome = ua.includes('chrome') && !ua.includes('edg');
    const isEdge = ua.includes('edg');
    const isFirefox = ua.includes('firefox');
    const isSafari = ua.includes('safari') && !ua.includes('chrome') && !ua.includes('edg');
    const isIOS = /iphone|ipad|ipod/.test(ua);
    
    console.log('Browser detection:', { isChrome, isEdge, isFirefox, isSafari, isIOS });
    
    // Format preferences based on browser
    const formats = [];
    
    // Add supported formats in order of preference for each browser
    if (isChrome || isEdge) {
      formats.push(
        { mimeType: 'audio/webm;codecs=opus', extension: 'webm' },
        { mimeType: 'audio/webm', extension: 'webm' },
        { mimeType: 'audio/mp4', extension: 'mp4' }
      );
    } else if (isFirefox) {
      formats.push(
        { mimeType: 'audio/ogg;codecs=opus', extension: 'ogg' },
        { mimeType: 'audio/webm;codecs=opus', extension: 'webm' },
        { mimeType: 'audio/webm', extension: 'webm' }
      );
    } else if (isSafari || isIOS) {
      formats.push(
        { mimeType: 'audio/mp4', extension: 'mp4' },
        { mimeType: 'audio/mp4;codecs=mp4a.40.2', extension: 'mp4' },
        { mimeType: 'audio/mpeg', extension: 'mp3' }
      );
    } else {
      // Default for unknown browsers
      formats.push(
        { mimeType: 'audio/webm', extension: 'webm' },
        { mimeType: 'audio/mp4', extension: 'mp4' },
        { mimeType: 'audio/ogg', extension: 'ogg' }
      );
    }
    
    // Find the first supported format
    for (const format of formats) {
      try {
        if (MediaRecorder.isTypeSupported(format.mimeType)) {
          console.log(`Found supported format: ${format.mimeType}`);
          return format;
        }
      } catch (e) {
        console.warn(`Error checking format ${format.mimeType}:`, e);
      }
    }
    
    // Fallback if no format is supported
    console.warn('No supported formats found, using default');
    return { mimeType: '', extension: 'webm' };
  };
  
  return (

    <div className="session-page">
      <Container fluid>
        <Grid padded>
          <Grid.Row>
            <Grid.Column width={16}>
              <Header as='h1' inverted className="session-header">
                <Icon name='music' />
                <Header.Content>
                  Imogine Session
                  <Header.Subheader>Create music with hand gestures</Header.Subheader>
                </Header.Content>
                <Button 
                  icon 
                  labelPosition='left' 
                  floated='right'
                  onClick={() => navigate('/')}
                  className="back-button"
                >
                  <Icon name='arrow left' />
                  Back to Dashboard
                </Button>
              </Header>
            </Grid.Column>
          </Grid.Row>
          
          <Grid.Row>
            <Grid.Column width={10}>
              <Segment inverted className="audio-segment">
                <Header as='h3' inverted>
                  <Icon name='microphone' />
                  Audio Recording
                </Header>
                
                <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
                  {!isRecording && !recordedAudio && (
                    <Button 
                      primary 
                      size='large' 
                      icon 
                      labelPosition='left'
                      onClick={startRecording}
                      className="record-button"
                    >
                      <Icon name='circle' />
                      Start Recording
                    </Button>
                  )}
                  
                  {isRecording && (
                    <Button 
                      negative 
                      size='large' 
                      icon 
                      labelPosition='left'
                      onClick={stopRecording}
                      className="stop-button"
                    >
                      <Icon name='stop' />
                      Stop Recording
                    </Button>
                  )}
                </div>
                
                <div style={{ width: '100%', height: '150px', position: 'relative' }}>
                  <canvas 
                    ref={canvasRef} 
                    style={{ 
                      width: '100%', 
                      height: '100%',
                      background: 'rgba(22, 33, 62, 0.5)',
                      borderRadius: '8px'
                    }}
                  />
                </div>
                
                {recordedAudio && (
                  <div style={{ marginTop: '1rem', textAlign: 'center' }}>
                    <audio 
                      src={recordedAudio} 
                      controls 
                      style={{ width: '100%', marginBottom: '1rem' }}
                      onPlay={() => setIsPlayingRecording(true)}
                      onPause={() => setIsPlayingRecording(false)}
                      onEnded={() => setIsPlayingRecording(false)}
                    />
                    
                    <Button 
                      primary
                      icon 
                      labelPosition='left'
                      onClick={saveRecording}
                      disabled={isPlayingRecording}
                      className="save-button"
                    >
                      <Icon name='save' />
                      Save Recording
                    </Button>
                    
                    {saveStatus === 'success' && (
                      <Message positive>
                        <Icon name='check' />
                        Recording saved successfully!
                      </Message>
                    )}
                    
                    {saveStatus === 'error' && (
                      <Message negative>
                        <Icon name='times' />
                        Error saving recording. Please try again.
                      </Message>
                    )}
                  </div>
                )}
              </Segment>
              
              <HandGestureDetector onGestureDetected={handleGestureDetected} />
            </Grid.Column>
            
            <Grid.Column width={6}>
              <Segment inverted className="guide-segment">
                <Header as='h3' inverted>
                  <Icon name='info circle' />
                  Gesture Guide
                </Header>
                <List relaxed inverted>
                  <List.Item>
                    <List.Icon name='hand point up' />
                    <List.Content>
                      <List.Header>Volume Control</List.Header>
                      <List.Description>Pinch gesture (thumb and index finger distance)</List.Description>
                    </List.Content>
                  </List.Item>
                  <List.Item>
                    <List.Icon name='hand rock' />
                    <List.Content>
                      <List.Header>Pitch Control</List.Header>
                      <List.Description>Hand height (raise or lower your hand)</List.Description>
                    </List.Content>
                  </List.Item>
                  <List.Item>
                    <List.Icon name='hand paper' />
                    <List.Content>
                      <List.Header>Tempo Control</List.Header>
                      <List.Description>Horizontal hand movement (move hand left/right)</List.Description>
                    </List.Content>
                  </List.Item>
                </List>
              </Segment>
              
              <Segment inverted className="effects-segment">
                <Header as='h3' inverted>
                  <Icon name='magic' />
                  Applied Effects
                </Header>
                
                {subscriptionData?.effectApplied ? (
                  <List divided inverted relaxed>
                    <List.Item>
                      <List.Content>
                        <List.Header>
                          <Label color={
                            subscriptionData.effectApplied.type === 'volume' ? 'blue' :
                            subscriptionData.effectApplied.type === 'pitch' ? 'teal' :
                            subscriptionData.effectApplied.type === 'tempo' ? 'purple' : 'grey'
                          } className="effect-label">
                            {subscriptionData.effectApplied.type.toUpperCase()}
                          </Label>
                        </List.Header>
                        <List.Description>
                          <p>Parameters: {JSON.stringify(subscriptionData.effectApplied.parameters)}</p>
                          <p>Time: {new Date(subscriptionData.effectApplied.timestamp).toLocaleTimeString()}</p>
                        </List.Description>
                      </List.Content>
                    </List.Item>
                  </List>
                ) : (
                  <Message info inverted className="info-message">
                    <Message.Content>
                      No effects applied yet. Use hand gestures to create effects!
                    </Message.Content>
                  </Message>
                )}
              </Segment>
              
              <Button 
                negative 
                icon 
                labelPosition='left' 
                onClick={() => setConfirmEndOpen(true)}
                fluid
                className="end-button"
              >
                <Icon name='sign-out' />
                End Session
              </Button>
            </Grid.Column>
          </Grid.Row>
        </Grid>
      </Container>
      
      <Modal
        basic
        open={confirmEndOpen}
        size='small'
      >
        <Header icon>
          <Icon name='sign-out' />
          End Session
        </Header>
        <Modal.Content>
          <p>Are you sure you want to end this session? Any unsaved recordings will be lost.</p>
        </Modal.Content>
        <Modal.Actions>
          <Button basic color='red' inverted onClick={() => setConfirmEndOpen(false)}>
            <Icon name='remove' /> No
          </Button>
          <Button color='green' inverted onClick={handleEndSession}>
            <Icon name='checkmark' /> Yes
          </Button>
        </Modal.Actions>
      </Modal>
      
      <Dimmer active={isEndingSession} inverted>
        <Loader>Ending Session...</Loader>
      </Dimmer>
    </div>
  );
}

export default SessionPage;