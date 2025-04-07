import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from '@apollo/client';
import { START_SESSION, GET_USER_SESSIONS } from '../graphql/operations';
import { 
  Container, 
  Header, 
  Button, 
  Icon, 
  Segment, 
  Grid, 
  Card, 
  Image, 
  Divider, 
  Message,
  Dimmer,
  Loader,
  Modal,
  Audio
} from 'semantic-ui-react';
import logo from '../assets/imogine-logo.png'; // Make sure you have a logo image

function Dashboard() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [selectedRecording, setSelectedRecording] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Temporary user ID - in a real app, this would come from authentication
  const userId = 'temp-user';
  
  // Fetch user sessions with error handling
  const { data: sessionsData, loading: sessionsLoading, error: sessionsError, refetch } = useQuery(GET_USER_SESSIONS, {
    variables: { userId },
    fetchPolicy: 'network-only', // Don't use cache for this query
    onError: (error) => {
      console.error('GraphQL error details:', error);
    }
  });
  
  const [startSession] = useMutation(START_SESSION, {
    onCompleted: (data) => {
      setIsLoading(false);
      navigate(`/session/${data.startSession.id}`);
    },
    onError: (error) => {
      setIsLoading(false);
      console.error('Error starting session:', error);
    }
  });
  
  const handleStartSession = async () => {
    setIsLoading(true);
    try {
      await startSession();
    } catch (error) {
      setIsLoading(false);
      console.error('Error starting session:', error);
    }
  };
  
  const handlePlayRecording = (recordingPath) => {
    console.log('Playing recording from URL:', recordingPath);
    console.log('Original recording path:', recordingPath);

    // Extract filename from the path
    const filename = recordingPath.split('/').pop();
    
    // Use the API endpoint that handles browser compatibility
    const apiUrl = `http://localhost:4000/api/audio/${filename}`;
    console.log('Using API endpoint:', apiUrl);
    
    // Set the selected recording and open the modal
    setSelectedRecording(apiUrl);
    setIsModalOpen(true);
  };
  
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };
  
  const countEffects = (effects) => {
    if (!effects || effects.length === 0) return 0;
    
    // Count unique effect types instead of total effects
    const uniqueEffectTypes = new Set();
    effects.forEach(effect => {
      if (effect && effect.type) {
        uniqueEffectTypes.add(effect.type);
      }
    });
    
    return uniqueEffectTypes.size;
  };
  
  return (
    <Container fluid style={{ 
      background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)', 
      minHeight: '100vh',
      padding: '2em'
    }}>
      <Segment basic textAlign='center' style={{ marginBottom: '2em' }}>
        <Image centered size='small' src={logo} style={{ marginBottom: '1em' }} />
        <Header as='h1' inverted style={{ 
          fontSize: '3em',
          background: 'linear-gradient(90deg, #4facfe 0%, #00f2fe 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent'
        }}>
          Imogine
        </Header>
        <Header as='h2' inverted style={{ fontWeight: 300, marginTop: 0 }}>
          Create music with hand gestures
        </Header>
      </Segment>
      
      <Grid centered stackable>
        <Grid.Row>
          <Grid.Column width={12}>
            <Segment padded='very' style={{ background: 'rgba(255, 255, 255, 0.05)', border: 'none' }}>
              <Header as='h2' inverted textAlign='center'>
                Transform Your Movements Into Music
              </Header>
              <p style={{ color: 'white', fontSize: '1.2em', textAlign: 'center', lineHeight: 1.6 }}>
                Imogine is an innovative AI-powered music creation app that lets you compose and modify songs 
                in real-time using just your hands. Whether you're a musician, producer, or just someone who 
                loves experimenting with music, Imogine turns creativity into an immersive, hands-free experience.
              </p>
              
              <Divider horizontal inverted>
                <Header as='h4' inverted>
                  <Icon name='hand point up outline' />
                  Get Started
                </Header>
              </Divider>
              
              <div style={{ textAlign: 'center', margin: '2em 0' }}>
                <Button 
                  primary 
                  size='huge' 
                  onClick={handleStartSession}
                  loading={isLoading}
                  disabled={isLoading}
                  style={{
                    background: 'linear-gradient(90deg, #4facfe 0%, #00f2fe 100%)',
                    borderRadius: '50px',
                    padding: '1em 2.5em'
                  }}
                >
                  <Icon name='music' />
                  Start New Session
                </Button>
                <Message info style={{ maxWidth: '500px', margin: '1.5em auto', background: 'rgba(33, 133, 208, 0.2)' }}>
                  <Icon name='info circle' />
                  Use hand gestures to control pitch, volume, and tempo in real-time!
                </Message>
              </div>
            </Segment>
          </Grid.Column>
        </Grid.Row>
        
        <Grid.Row>
          <Grid.Column width={12}>
            <Segment style={{ background: 'rgba(255, 255, 255, 0.05)', border: 'none' }}>
              <Header as='h3' inverted>
                <Icon name='history' />
                Recent Sessions
              </Header>
              
              {sessionsLoading ? (
                <div style={{ padding: '2em', textAlign: 'center' }}>
                  <Loader active inverted>Loading Sessions</Loader>
                </div>
              ) : sessionsError ? (
                <Message negative>
                  <Message.Header>Error loading sessions</Message.Header>
                  <p>{sessionsError.message}</p>
                  <pre style={{ whiteSpace: 'pre-wrap', overflowWrap: 'break-word' }}>
                    {JSON.stringify(sessionsError, null, 2)}
                  </pre>
                </Message>
              ) : (
                <Card.Group itemsPerRow={3} stackable>
                  {sessionsData && sessionsData.getUserSessions && sessionsData.getUserSessions.length > 0 ? (
                    sessionsData.getUserSessions
                      .filter(session => session.recordingPath) // Only show sessions with recordings
                      .map(session => (
                        <Card key={session.id} style={{ background: 'rgba(255, 255, 255, 0.1)' }}>
                          <Card.Content>
                            <Card.Header style={{ color: 'white' }}>
                              Session {session.id.substring(0, 8)}...
                            </Card.Header>
                            <Card.Meta style={{ color: '#4facfe' }}>
                              {formatDate(session.startedAt)}
                            </Card.Meta>
                            <Card.Description style={{ color: 'rgba(255, 255, 255, 0.8)' }}>
                              {countEffects(session.currentEffects) > 0 
                                ? `${countEffects(session.currentEffects)} unique effect types used` 
                                : 'No effects applied'}
                            </Card.Description>
                          </Card.Content>
                          <Card.Content extra>
                            <Button 
                              basic 
                              inverted 
                              fluid
                              onClick={() => handlePlayRecording(session.recordingPath)}
                            >
                              <Icon name='play' />
                              Play Recording
                            </Button>
                          </Card.Content>
                        </Card>
                      ))
                  ) : (
                    <Card style={{ background: 'rgba(255, 255, 255, 0.05)', width: '100%' }}>
                      <Card.Content textAlign='center'>
                        <Icon name='music' size='huge' style={{ color: 'rgba(255, 255, 255, 0.2)', margin: '1em 0' }} />
                        <Card.Description style={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                          No recorded sessions yet. Start creating!
                        </Card.Description>
                      </Card.Content>
                    </Card>
                  )}
                </Card.Group>
              )}
            </Segment>
          </Grid.Column>
        </Grid.Row>
      </Grid>
      
      <Segment basic textAlign='center' style={{ marginTop: '3em' }}>
        <p style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
          © 2023 Imogine - Transform your movements into music
        </p>
      </Segment>
      
      <Modal
        basic
        open={isModalOpen}
        onClose={() => {
          // Make sure to pause audio when closing modal
          const audioElement = document.getElementById('recording-audio');
          if (audioElement) {
            audioElement.pause();
          }
          setIsModalOpen(false);
        }}
        size='small'
      >
        <Header icon>
          <Icon name='music' />
          Session Recording
        </Header>
        <Modal.Content>
          {selectedRecording && (
            <div style={{ textAlign: 'center' }}>
              <audio 
                id="recording-audio"
                controls 
                src={selectedRecording}
                style={{ width: '100%' }}
                onError={(e) => {
                  console.error('Audio playback error:', e);
                  console.error('Audio element error details:', e.target.error);
                  
                  // More specific error message based on the error code
                  let errorMessage = 'Error playing the recording. ';
                  
                  if (e.target.error) {
                    switch (e.target.error.code) {
                      case e.target.error.MEDIA_ERR_ABORTED:
                        errorMessage += 'Playback aborted.';
                        break;
                      case e.target.error.MEDIA_ERR_NETWORK:
                        errorMessage += 'Network error occurred.';
                        break;
                      case e.target.error.MEDIA_ERR_DECODE:
                        errorMessage += 'Decoding error. The file might be corrupted.';
                        break;
                      case e.target.error.MEDIA_ERR_SRC_NOT_SUPPORTED:
                        errorMessage += 'Format not supported or file not found.';
                        break;
                      default:
                        errorMessage += 'Unknown error.';
                    }
                  }
                  
                  alert(errorMessage);
                }}
              />
              <div style={{ marginTop: '1rem', color: 'white' }}>
                <p>If the audio doesn't play automatically, click the play button.</p>
              </div>
            </div>
          )}
        </Modal.Content>
        <Modal.Actions>
          <Button color='green' inverted onClick={() => setIsModalOpen(false)}>
            <Icon name='checkmark' /> Close
          </Button>
        </Modal.Actions>
      </Modal>
      
      {isLoading && (
        <Dimmer active>
          <Loader size='large'>Preparing Your Session...</Loader>
        </Dimmer>
      )}
    </Container>
  );
}

export default Dashboard;