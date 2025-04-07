import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMutation, useSubscription } from '@apollo/client';
import { APPLY_GESTURE_EFFECT, END_SESSION } from '../graphql/operations';
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
import * as Tone from 'tone';

function SessionPage() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  
  const userMediaRef = useRef(null);
  const pitchShiftRef = useRef(null);
  const analyserRef = useRef(null);
  const mediaStreamDestRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);
  const canvasRef = useRef(null);
  const audioPlayerRef = useRef(null);

  const [isRecording, setIsRecording] = useState(false);
  const [recordedAudioUrl, setRecordedAudioUrl] = useState(null);
  const [saveStatus, setSaveStatus] = useState('idle');
  const [lastRecordingPath, setLastRecordingPath] = useState(null);
  const [isEndingSession, setIsEndingSession] = useState(false);
  const [confirmEndOpen, setConfirmEndOpen] = useState(false);
  const [isPlayingRecording, setIsPlayingRecording] = useState(false);
  const [audioFormatInfo, setAudioFormatInfo] = useState({ mimeType: 'audio/webm', extension: 'webm' });
  const [browserType, setBrowserType] = useState('unknown');
  const [initError, setInitError] = useState(null);
  const audioFormatInfoRef = useRef({ mimeType: 'audio/webm', extension: 'webm' });
  const [lastEffect, setLastEffect] = useState(null);

  const [applyEffectMutation] = useMutation(APPLY_GESTURE_EFFECT);
  const [endSessionMutation] = useMutation(END_SESSION);
  
  useSubscription(EFFECT_APPLIED_SUBSCRIPTION, { 
    variables: { sessionId },
    onData: ({ data }) => {
      if (data.data?.effectApplied) {
        // console.log('Effect received:', data.data.effectApplied); // Log less verbosely
        setLastEffect(data.data.effectApplied);
      }
    }
  });

  const detectOptimalAudioFormat = useCallback(() => {
    const ua = navigator.userAgent.toLowerCase();
    const isChrome = ua.includes('chrome') && !ua.includes('edg');
    const isEdge = ua.includes('edg');
    const isFirefox = ua.includes('firefox');
    const isSafari = ua.includes('safari') && !isChrome && !isEdge;
    
    let detectedType = 'unknown';
    if (isSafari) detectedType = 'safari';
    else if (isChrome) detectedType = 'chrome';
    else if (isFirefox) detectedType = 'firefox';
    else if (isEdge) detectedType = 'edge';
    setBrowserType(detectedType);
    
    console.log('Browser detected:', { type: detectedType, isSafari, isChrome, isEdge, isFirefox });
    
    const formats = [];
    if (isSafari) {
      const safariPrefs = [
        { mimeType: 'audio/mp4', extension: 'mp4' }, 
        { mimeType: 'audio/mp4;codecs=mp4a.40.2', extension: 'mp4' },
        { mimeType: 'audio/webm;codecs=opus', extension: 'webm' }, 
        { mimeType: 'audio/webm', extension: 'webm' },
        { mimeType: 'audio/aac', extension: 'aac' }, 
      ];
      for (const format of safariPrefs) {
        if (MediaRecorder.isTypeSupported(format.mimeType)) {
          console.log(`[Safari] Found supported format: ${format.mimeType}`);
          return format;
        }
      }
      console.warn('[Safari] Could not find a well-supported MP4 or WebM recording format.');
    } 
    
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
    } else {
      formats.push(
        { mimeType: 'audio/webm;codecs=opus', extension: 'webm' },
        { mimeType: 'audio/webm', extension: 'webm' },
        { mimeType: 'audio/mp4', extension: 'mp4' },
        { mimeType: 'audio/ogg', extension: 'ogg' }
      );
    }
    
    for (const format of formats) {
      if (MediaRecorder.isTypeSupported(format.mimeType)) {
        console.log(`[Other Browser] Found supported format: ${format.mimeType}`);
        return format;
      }
    }
    
    console.warn('Could not find any preferred MediaRecorder format. Using default webm.');
    return { mimeType: 'audio/webm', extension: 'webm' };
  }, []);
  
  const visualize = useCallback(() => {
    if (!canvasRef.current || !analyserRef.current) return;
    const canvas = canvasRef.current;
    const canvasCtx = canvas.getContext('2d');
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    const width = canvas.width;
    const height = canvas.height;
    const analyser = analyserRef.current;
    let animationFrameId;

    const draw = () => {
      if (!analyserRef.current || !canvasRef.current) return;
      animationFrameId = requestAnimationFrame(draw);
      const dataArray = analyser.getValue();
      if (!dataArray || dataArray.length === 0) return;

      canvasCtx.fillStyle = 'rgba(22, 33, 62, 0.8)';
      canvasCtx.fillRect(0, 0, width, height);
      canvasCtx.lineWidth = 2;
      canvasCtx.strokeStyle = '#4facfe';
      canvasCtx.beginPath();
      const sliceWidth = width / dataArray.length;
      let x = 0;
      for (let i = 0; i < dataArray.length; i++) {
        const v = dataArray[i];
        const y = (v * 0.5 + 0.5) * height;
        if (i === 0) canvasCtx.moveTo(x, y);
        else canvasCtx.lineTo(x, y);
        x += sliceWidth;
      }
      canvasCtx.stroke();
    };
    draw();

    return () => cancelAnimationFrame(animationFrameId);
  }, []);

  useEffect(() => {
    let audioCleanup = [];
    let animationCleanup = null;

    const initAudio = async () => {
      try {
        setInitError(null);
        await Tone.start();
        console.log('Tone.js AudioContext started/resumed.');
        await Tone.context.resume();

        userMediaRef.current = new Tone.UserMedia();
        audioCleanup.push(() => { console.log('Disposing UserMedia'); userMediaRef.current?.dispose(); });

        // Create PitchShift node *without* connecting to destination immediately
        pitchShiftRef.current = new Tone.PitchShift({ pitch: 0, windowSize: 0.1 });
        audioCleanup.push(() => { console.log('Disposing PitchShift'); pitchShiftRef.current?.dispose(); });
        
        analyserRef.current = new Tone.Analyser('waveform', 1024);
        audioCleanup.push(() => { console.log('Disposing Analyser'); analyserRef.current?.dispose(); });

        mediaStreamDestRef.current = Tone.context.createMediaStreamDestination();

        // Connect UserMedia to PitchShift
        userMediaRef.current.connect(pitchShiftRef.current);
        
        // Connect PitchShift ONLY to the analyser and the recorder destination
        pitchShiftRef.current.connect(analyserRef.current);
        pitchShiftRef.current.connect(mediaStreamDestRef.current);
        
        await userMediaRef.current.open();
        console.log('Microphone opened.');

        const formatInfo = detectOptimalAudioFormat();
        setAudioFormatInfo(formatInfo);
        audioFormatInfoRef.current = formatInfo;
        console.log('Selected audio format:', formatInfo);

        mediaRecorderRef.current = new MediaRecorder(mediaStreamDestRef.current.stream, { 
          mimeType: audioFormatInfoRef.current.mimeType || 'audio/webm',
          audioBitsPerSecond: 128000 
        });

        mediaRecorderRef.current.ondataavailable = (event) => {
          if (event.data.size > 0) recordedChunksRef.current.push(event.data);
        };

        mediaRecorderRef.current.onstop = () => {
          console.log('MediaRecorder stopped.');
          if (recordedChunksRef.current.length > 0) {
            let playbackType;
            switch (audioFormatInfoRef.current.extension) {
               case 'mp4':
                 playbackType = 'audio/mp4';
                 break;
               case 'aac':
                  playbackType = 'audio/aac';
                  break;
               case 'ogg':
                  playbackType = 'audio/ogg';
                  break;
               case 'webm':
               default:
                 playbackType = 'audio/webm';
                 break;
            }

            console.log(`Creating blob with playback type: ${playbackType} (based on recorded extension: ${audioFormatInfoRef.current.extension}, full recorded type: ${audioFormatInfoRef.current.mimeType})`);

            const blob = new Blob(recordedChunksRef.current, { type: playbackType });
            const url = URL.createObjectURL(blob);
            if (recordedAudioUrl) URL.revokeObjectURL(recordedAudioUrl);
            setRecordedAudioUrl(url);
            console.log('Blob URL created for playback:', url);
          } else {
            console.log('No chunks recorded.');
            if (recordedAudioUrl) URL.revokeObjectURL(recordedAudioUrl);
            setRecordedAudioUrl(null);
          }
          recordedChunksRef.current = [];
          setIsRecording(false);
        };
        
        mediaRecorderRef.current.onerror = (event) => {
          console.error('MediaRecorder error:', event.error);
          setIsRecording(false);
        };

        animationCleanup = visualize();

      } catch (error) {
        console.error('Audio initialization error:', error);
        let userMessage = 'Failed to initialize audio. Check mic permissions and connection.';
        if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
          userMessage = 'Microphone access denied. Please allow access and refresh.';
        } else if (error.message.includes('suspended')) {
          userMessage = 'Audio context blocked. Click the page to enable audio.';
        }
        setInitError(userMessage);
      }
    };
    
    initAudio();
    
    return () => {
      console.log('Running SessionPage cleanup...');
      animationCleanup?.();
      
      if (mediaRecorderRef.current?.state === 'recording') {
        console.log('Stopping active MediaRecorder during cleanup.');
        mediaRecorderRef.current.stop();
      }
      if (mediaRecorderRef.current) {
          mediaRecorderRef.current.ondataavailable = null;
          mediaRecorderRef.current.onstop = null;
          mediaRecorderRef.current.onerror = null;
      }
      
      if (recordedAudioUrl) {
        console.log('Revoking existing recording URL.');
        URL.revokeObjectURL(recordedAudioUrl);
      }
      
      audioCleanup.reverse().forEach(cleanup => cleanup());
      console.log('SessionPage cleanup complete.');
    };
  }, [sessionId]);

  const startRecording = useCallback(async () => {
    if (!mediaRecorderRef.current || initError || isRecording) {
      console.warn("Cannot start recording. Check init status or if already recording.");
      return;
    }
    try {
      await Tone.start(); 
      await Tone.context.resume();

      if (recordedAudioUrl) URL.revokeObjectURL(recordedAudioUrl);
      setRecordedAudioUrl(null);
      setSaveStatus('idle');
      setLastRecordingPath(null);
      recordedChunksRef.current = [];
      
      mediaRecorderRef.current.start(1000);
      setIsRecording(true);
      console.log('Recording started.');
    } catch (error) {
      console.error('Error starting recording:', error);
      setInitError('Could not start recording. Please check microphone.');
    }
  }, [initError, isRecording, recordedAudioUrl]);
  
  const stopRecording = useCallback(() => {
    if (!mediaRecorderRef.current || mediaRecorderRef.current.state !== 'recording') {
        console.warn('Stop recording called but recorder not active.');
        if (isRecording) setIsRecording(false);
        return; 
    }
    mediaRecorderRef.current.stop();
    console.log('Recording stop requested.');
  }, [isRecording]);

  const playRecordedAudio = useCallback(() => {
    if (!recordedAudioUrl || isPlayingRecording) return;

    if (audioPlayerRef.current) {
        audioPlayerRef.current.onended = null;
        audioPlayerRef.current.onerror = null;
    }

    audioPlayerRef.current = new Audio(recordedAudioUrl);
    setIsPlayingRecording(true);

    audioPlayerRef.current.onended = () => {
        setIsPlayingRecording(false);
        audioPlayerRef.current = null;
    };
    audioPlayerRef.current.onerror = (e) => {
        console.error("Error playing recorded audio:", e);
        setIsPlayingRecording(false);
        setSaveStatus('error');
        audioPlayerRef.current = null;
    };
    audioPlayerRef.current.play().catch(e => {
        console.error("Playback initiation failed:", e);
        setIsPlayingRecording(false); 
        audioPlayerRef.current = null;
    });
  }, [recordedAudioUrl, isPlayingRecording]);

  const applyAudioEffect = useCallback((type, parameters) => {
    if (!pitchShiftRef.current) return;

    if (type === 'pitch' && parameters.level !== undefined) {
      const minSemitones = -12;
      const maxSemitones = 12;
      const totalRange = maxSemitones - minSemitones; // e.g., 24

      // Ensure level is clamped 0-1 before calculations
      const level = Math.max(0, Math.min(1, parameters.level));

      // Define a dead zone threshold around the center (e.g., +/- 5%)
      const deadZoneCenter = 0.5;
      const deadZoneRadius = 0.05; // +/- 0.05 around center
      const lowerDeadZone = deadZoneCenter - deadZoneRadius; // 0.45
      const upperDeadZone = deadZoneCenter + deadZoneRadius; // 0.55

      let pitchValue = 0; // Default to 0 pitch

      if (level < lowerDeadZone) {
        // Below dead zone: Map the range [0, lowerDeadZone) to [minSemitones, 0)
        // Normalize level within the lower range [0, lowerDeadZone)
        const normalizedLower = level / lowerDeadZone; // Range 0 to 1
        pitchValue = minSemitones * (1 - normalizedLower); // Map 0->min, lowerDeadZone->0
      
      } else if (level > upperDeadZone) {
        // Above dead zone: Map the range (upperDeadZone, 1] to (0, maxSemitones]
        // Normalize level within the upper range (upperDeadZone, 1]
        const normalizedUpper = (level - upperDeadZone) / (1 - upperDeadZone); // Range 0 to 1
        pitchValue = maxSemitones * normalizedUpper; // Map upperDeadZone->0, 1->max
      
      } else {
         // Inside dead zone, pitchValue remains 0
      }

      // Ensure value is clamped (might be redundant now, but safe)
      const clampedPitchValue = Math.max(minSemitones, Math.min(maxSemitones, pitchValue));

      pitchShiftRef.current.set({ pitch: clampedPitchValue });
    }
  }, []);

  const handleGestureDetected = useCallback((gesture) => {
    if (gesture?.type && gesture.parameters) {
      applyAudioEffect(gesture.type, gesture.parameters);
      applyEffectMutation({
        variables: {
          sessionId,
          type: gesture.type,
          parameters: gesture.parameters
        }
      }).catch(error => {
        console.error('Error sending effect mutation:', error);
      });
    }
  }, [applyAudioEffect, applyEffectMutation, sessionId]);

  const handleEndSessionConfirm = useCallback(() => setConfirmEndOpen(true), []);
  
  const handleEndSession = useCallback(async () => {
    setConfirmEndOpen(false);
    setIsEndingSession(true);
    try {
      if (isRecording) {
        console.log('Stopping recording before ending session.');
        stopRecording();
        await new Promise(resolve => setTimeout(resolve, 300)); 
      }
      await endSessionMutation({ variables: { sessionId } });
      console.log('Session ended successfully, navigating home.');
      navigate('/');
    } catch (error) {
      console.error('Error ending session:', error);
      setInitError(`Error ending session: ${error.message}`); 
      setIsEndingSession(false);
    }
  }, [isRecording, stopRecording, endSessionMutation, sessionId, navigate]);

  const saveRecording = useCallback(async () => {
    if (!recordedAudioUrl) {
      console.error("No recorded audio available to save.");
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 5000);
      return; 
    }
  
    setSaveStatus('saving');
    try {
      const response = await fetch(recordedAudioUrl);
      if (!response.ok) throw new Error(`Failed to fetch blob: ${response.statusText}`);
      const blob = await response.blob();
      
      console.log('Uploading recording:', { size: blob.size, type: blob.type });
      
      const formData = new FormData();
      const extension = audioFormatInfoRef.current.extension || 'webm';
      const filename = `session-${sessionId}-${Date.now()}.${extension}`;
      
      formData.append('audio', blob, filename);
      formData.append('sessionId', sessionId);
      formData.append('mimeType', audioFormatInfoRef.current.mimeType || blob.type);
      formData.append('fileExtension', extension);
      formData.append('recordingFormat', JSON.stringify(audioFormatInfoRef.current));
      formData.append('browserInfo', JSON.stringify({
        userAgent: navigator.userAgent,
        platform: navigator.platform,
      }));
      
      const uploadUrl = 'http://localhost:4000/upload-recording';
      const uploadResponse = await fetch(uploadUrl, { method: 'POST', body: formData });
  
      if (!uploadResponse.ok) {
          const errorBody = await uploadResponse.text();
          throw new Error(`Upload failed (${uploadResponse.status}): ${errorBody}`);
      }
      
      const result = await uploadResponse.json();
      if (result.success && result.filePath) {
        setSaveStatus('success');
        setLastRecordingPath(result.filePath);
        setTimeout(() => setSaveStatus('idle'), 5000);
      } else {
        throw new Error(result.message || "Backend error during save.");
      }
    } catch (error) {
      console.error('Error saving recording:', error);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 7000);
    }
  }, [recordedAudioUrl, audioFormatInfoRef, sessionId]);

  const formatEffectParameters = (params) => {
      if (!params) return 'N/A';
      try {
          if (params.level !== undefined) return `Level: ${Number(params.level).toFixed(2)}`;
          if (params.zone !== undefined) return `Zone: ${params.zone}`;
          return JSON.stringify(params);
      } catch (e) {
          console.error("Error formatting params:", params, e);
          return "Invalid Data";
      }
  };

  if (initError && !isEndingSession) {
      return (
          <Container className="session-page error-page">
              <Message negative icon size='huge' style={{ margin: '5em auto', maxWidth: '600px' }}>
                  <Icon name='warning sign' />
                  <Message.Content>
                      <Message.Header>Session Error</Message.Header>
                      <p>{initError}</p>
                      <Button onClick={() => window.location.reload()} primary style={{ marginTop: '1em' }}>
                          <Icon name='refresh' /> Refresh Page
                      </Button>
                       <Button onClick={() => navigate('/')} style={{ marginTop: '1em' }}>
                          <Icon name='home' /> Go to Dashboard
                      </Button>
                  </Message.Content>
              </Message>
          </Container>
      );
  }

  return (
    <div className="session-page">
      <Container fluid className="session-container">
        <Segment basic inverted className="session-header-segment">
          <Grid verticalAlign='middle'>
            <Grid.Row>
              <Grid.Column mobile={16} tablet={8} computer={9}>
                <Header as='h1' inverted className="session-title">
                  <Icon name='sound' />
                  <Header.Content>
                    Imogine Session
                    <Header.Subheader>ID: {sessionId.substring(0, 8)}...</Header.Subheader>
                  </Header.Content>
                </Header>
              </Grid.Column>
              <Grid.Column mobile={16} tablet={8} computer={7} textAlign='right' className="header-buttons">
                <Button 
                  icon 
                  labelPosition='left' 
                  onClick={() => navigate('/')}
                  className="back-button"
                  basic inverted
                  size='tiny'
                >
                  <Icon name='arrow left' />
                  Dashboard
                </Button>
                <Button 
                  negative 
                  icon 
                  labelPosition='left' 
                  onClick={handleEndSessionConfirm} 
                  size='tiny'
                  className="end-button-header"
                  loading={isEndingSession}
                  disabled={isEndingSession}
                >
                  <Icon name='stop circle outline' />
                  End Session
                </Button>
              </Grid.Column>
            </Grid.Row>
          </Grid>
        </Segment>

        <Grid stackable className="main-content-grid">
          <Grid.Row stretched>
            <Grid.Column mobile={16} tablet={9} computer={9} className="left-column">
              <Segment inverted className="audio-segment">
                <Header as='h3' inverted dividing className="segment-header">
                  <Icon name='microphone' /> Audio Control
                </Header>
                
                <div className="recording-controls">
                  {!isRecording && !recordedAudioUrl && (
                    <Button fluid primary size='medium' icon labelPosition='left' onClick={startRecording} className="record-button">
                      <Icon name='circle' /> Record Audio
                    </Button>
                  )}
                  {isRecording && (
                    <Button fluid negative size='medium' icon labelPosition='left' onClick={stopRecording} className="stop-button" loading={!recordedAudioUrl && isRecording}>
                      <Icon name='stop' /> Stop Recording
                    </Button>
                  )}
                  {recordedAudioUrl && !isRecording && (
                    <Grid columns={3} stackable centered>
                      <Grid.Column textAlign='center'>
                        <Button 
                          basic 
                          inverted 
                          color='teal' 
                          icon 
                          labelPosition='left' 
                          onClick={playRecordedAudio} 
                          disabled={isPlayingRecording || (browserType === 'safari' && audioFormatInfo.extension === 'webm')}
                          className="play-button" 
                          size='small'
                          title={ (browserType === 'safari' && audioFormatInfo.extension === 'webm') 
                                  ? "Playback unavailable until saved on Safari (WebM recording)" 
                                  : "Play recorded audio" }
                        >
                          <Icon name={isPlayingRecording ? 'pause' : 'play'} /> {isPlayingRecording ? 'Playing' : 'Play'}
                        </Button>
                      </Grid.Column>
                      <Grid.Column textAlign='center'>
                        <Button basic inverted color='green' icon labelPosition='left' onClick={saveRecording} disabled={saveStatus === 'saving' || isPlayingRecording} loading={saveStatus === 'saving'} className="save-button" size='small'>
                          <Icon name='save' /> Save
                        </Button>
                      </Grid.Column>
                      <Grid.Column textAlign='center'>
                         <Button basic inverted icon labelPosition='left' onClick={startRecording} className="record-again-button" size='small'>
                           <Icon name='redo' /> Record Again
                         </Button>
                      </Grid.Column>
                    </Grid>
                  )}
                </div>

                <div className="status-message-area">
                  {saveStatus === 'success' && (
                    <Message positive icon size='mini' className="status-message">
                      <Icon name='check circle outline' />
                      <Message.Content>Saved: {lastRecordingPath?.split('/').pop()}</Message.Content>
                    </Message>
                  )}
                  {saveStatus === 'error' && (
                    <Message negative icon size='mini' className="status-message">
                      <Icon name='times circle outline' />
                      <Message.Content>Save failed. Try again.</Message.Content>
                    </Message>
                  )}
                </div>
                
                <div className="visualization-container">
                  <canvas ref={canvasRef} className="audio-visualization-canvas" />
                  {!isRecording && !recordedAudioUrl && (
                    <div className="visualization-placeholder">
                      <Icon name='headphones' size='large'/>
                      <p>Audio waveform appears here</p>
                    </div>
                  )}
                </div>
              </Segment>
              
              <Segment inverted className="hand-detector-segment">
                 <Header as='h3' inverted dividing className="segment-header">
                  <Icon name='hand paper outline' /> Gesture Input
                </Header>
                <div className="detector-wrapper">
                  <HandGestureDetector onGestureDetected={handleGestureDetected} />
                </div>
              </Segment>
            </Grid.Column>
            
            <Grid.Column mobile={16} tablet={7} computer={7} className="right-column">
              <Segment inverted className="guide-segment">
                <Header as='h3' inverted dividing className="segment-header">
                  <Icon name='info circle' /> Gesture Guide
                </Header>
                <List relaxed inverted className="gesture-list">
                  <List.Item>
                    <Icon name='arrows alternate vertical' color='teal' />
                    <List.Content>
                      <List.Header>Pitch</List.Header>
                      <List.Description>Hand Height</List.Description>
                    </List.Content>
                  </List.Item>
                   <List.Item>
                    <Icon name='compress arrows' color='blue' />
                    <List.Content>
                      <List.Header>Volume (TBD)</List.Header>
                      <List.Description>Pinch Gesture</List.Description>
                    </List.Content>
                  </List.Item>
                   <List.Item>
                    <Icon name='arrows alternate horizontal' color='purple' />
                    <List.Content>
                      <List.Header>Tempo (TBD)</List.Header>
                      <List.Description>Horizontal Movement</List.Description>
                    </List.Content>
                  </List.Item>
                   <List.Item>
                     <Icon name='hand rock outline' color='orange' />
                     <List.Content>
                       <List.Header>Harmony (TBD)</List.Header>
                       <List.Description>Finger Poses</List.Description>
                     </List.Content>
                   </List.Item>
                </List>
              </Segment>
              
              <Segment inverted className="effects-segment">
                <Header as='h3' inverted dividing className="segment-header">
                  <Icon name='magic' /> Last Effect
                </Header>
                <div className="effect-display">
                  {lastEffect ? (
                    <List divided inverted relaxed className="effects-list">
                      <List.Item key={lastEffect.id + lastEffect.timestamp}>
                        <List.Content>
                          <Label size='small' color={ 
                              lastEffect.type === 'volume' ? 'blue' :
                              lastEffect.type === 'pitch' ? 'teal' :
                              lastEffect.type === 'tempo' ? 'purple' :
                              lastEffect.type === 'harmony' ? 'orange' : 'grey'
                            } horizontal className="effect-label">
                            {lastEffect.type.toUpperCase()}
                          </Label>
                          <span className="effect-details">
                           {formatEffectParameters(lastEffect.parameters)}
                          </span>
                          <span className="effect-timestamp"> 
                            {new Date(parseInt(lastEffect.timestamp)).toLocaleTimeString()}
                          </span>
                        </List.Content>
                      </List.Item>
                    </List>
                  ) : (
                    <Message info inverted icon size='small' className="info-message">
                      <Icon name='hand paper outline' />
                      <Message.Content>
                        <Message.Header>No Effects Active</Message.Header>
                        Perform gestures to apply effects.
                      </Message.Content>
                    </Message>
                  )}
                </div>
              </Segment>
            </Grid.Column>
          </Grid.Row>
        </Grid>
      </Container>
      
      <Modal
        basic
        open={confirmEndOpen}
        onClose={() => setConfirmEndOpen(false)}
        size='tiny'
        className="confirm-modal"
        closeIcon
      >
        <Header icon='question circle outline' content='Confirm End Session' />
        <Modal.Content>
          <p>End this session? The current recording (if any) must be saved first if you want to keep it.</p>
        </Modal.Content>
        <Modal.Actions>
          <Button basic color='grey' inverted onClick={() => setConfirmEndOpen(false)}>
            <Icon name='cancel' /> Cancel
          </Button>
          <Button color='red' inverted onClick={handleEndSession} loading={isEndingSession} disabled={isEndingSession}>
            <Icon name='check' /> End Session
          </Button>
        </Modal.Actions>
      </Modal>
      
      <Dimmer active={isEndingSession} page inverted>
        <Loader size='large' inverted>Ending Session...</Loader>
      </Dimmer>
    </div>
  );
}

export default SessionPage;