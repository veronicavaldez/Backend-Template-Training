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
} from 'semantic-ui-react';
import logo from '../assets/imogine-logo.png'; // Make sure you have a logo image
import '../styles/Dashboard.css'; // Import the CSS file

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
      // Simulate some delay if needed for UX, otherwise remove setTimeout
      // await new Promise(resolve => setTimeout(resolve, 500)); 
      await startSession();
    } catch (error) {
      setIsLoading(false);
      console.error('Error starting session:', error);
      // Optionally show a user-friendly error message here
    }
  };
  
  const handlePlayRecording = (recordingPath) => {
    console.log('Playing recording from URL:', recordingPath);
    const filename = recordingPath.split('/').pop();
    const apiUrl = `http://localhost:4000/api/audio/${filename}`;
    console.log('Using API endpoint:', apiUrl);
    setSelectedRecording(apiUrl);
    setIsModalOpen(true);
  };
  
  const formatDate = (dateString) => {
    if (!dateString) return 'Invalid date';
    try {
      const date = new Date(dateString);
      return date.toLocaleString();
    } catch (e) {
      console.error("Error formatting date:", e);
      return 'Invalid date';
    }
  };
  
  const countEffects = (effects) => {
    if (!effects || !Array.isArray(effects) || effects.length === 0) return 0;
    const uniqueEffectTypes = new Set(effects.map(effect => effect?.type).filter(Boolean));
    return uniqueEffectTypes.size;
  };
  
  return (
    <div className="dashboard-container">
      <Container>
        <Segment basic textAlign='center' className="dashboard-header">
          <Image centered size='small' src={logo} className="app-logo" />
          <Header as='h1' inverted className="main-title">
            Imogine
          </Header>
        </Segment>
        
        <Grid centered stackable>
          <Grid.Row>
            <Grid.Column mobile={16} tablet={12} computer={10}>
              <Segment padded='very' className="intro-segment">
                <Header as='h2' inverted textAlign='center' className="section-header">
                  Transform Your Movements Into Music
                </Header>
                <p className="intro-text">
                  Ccompose and modify songs with just the wave of a hand. 
                  Imogine the possibilities.
                </p>
                
                <Divider horizontal inverted section>
                  <Header as='h4' inverted>
                    <Icon name='hand point up outline' />
                    Get Started
                  </Header>
                </Divider>
                
                <div className="action-section">
                  <Button 
                    primary 
                    size='huge' 
                    onClick={handleStartSession}
                    loading={isLoading}
                    disabled={isLoading}
                    className="start-session-btn"
                  >
                    <Icon name='play circle outline' />
                    Start New Session
                  </Button>
                  <Message info compact className="gesture-hint">
                    <Icon name='info circle' />
                    Move your hand up and down to change the pitch of the song.
                  </Message>
                </div>
              </Segment>
            </Grid.Column>
          </Grid.Row>
          
          <Grid.Row>
            <Grid.Column mobile={16} tablet={12} computer={10}>
              <Segment className="recent-sessions-segment">
                <Header as='h3' inverted className="section-header">
                  <Icon name='history' />
                  Recent Sessions
                </Header>
                
                {sessionsLoading ? (
                  <Dimmer active inverted>
                    <Loader inverted>Loading Sessions...</Loader>
                  </Dimmer>
                ) : sessionsError ? (
                  <Message negative icon>
                    <Icon name='warning sign' />
                    <Message.Content>
                      <Message.Header>Error loading sessions</Message.Header>
                      <p>{sessionsError.message}</p>
                      {/* Consider logging full error only in dev mode */}
                      {/* <pre style={{ whiteSpace: 'pre-wrap', overflowWrap: 'break-word' }}>
                        {JSON.stringify(sessionsError, null, 2)}
                      </pre> */}
                    </Message.Content>
                  </Message>
                ) : (
                  <Card.Group itemsPerRow={3} stackable centered className="session-cards">
                    {sessionsData?.getUserSessions?.length > 0 ? (
                      sessionsData.getUserSessions
                        .filter(session => session?.recordingPath) // Filter out sessions without recordings safely
                        .map(session => session && ( // Check if session is not null/undefined
                          <Card key={session.id} className="session-card">
                            <Card.Content>
                              <Card.Header className="session-card-header">
                                <Icon name='music' /> Session #{session.id.substring(0, 6)}
                              </Card.Header>
                              <Card.Meta className="session-card-meta">
                                <Icon name='calendar alternate outline' /> {formatDate(session.startedAt)}
                              </Card.Meta>
                              <Card.Description className="session-card-description">
                                <Icon name='magic' /> 
                                {countEffects(session.currentEffects) > 0 
                                  ? `${countEffects(session.currentEffects)} effect type${countEffects(session.currentEffects) > 1 ? 's' : ''} used` 
                                  : 'No effects applied'}
                              </Card.Description>
                            </Card.Content>
                            <Card.Content extra>
                              <Button 
                                basic 
                                color='blue' 
                                fluid
                                icon
                                labelPosition='left'
                                onClick={() => handlePlayRecording(session.recordingPath)}
                                className="play-recording-btn"
                              >
                                <Icon name='play' />
                                Play Recording
                              </Button>
                            </Card.Content>
                          </Card>
                        ))
                    ) : (
                      <Message icon className="no-sessions-message">
                        <Icon name='meh outline' size='huge' />
                        <Message.Content>
                          <Message.Header>No Recorded Sessions Found</Message.Header>
                          Start a new session above to create some music!
                        </Message.Content>
                      </Message>
                    )}
                  </Card.Group>
                )}
              </Segment>
            </Grid.Column>
          </Grid.Row>
        </Grid>
        
        <Segment basic textAlign='center' className="dashboard-footer">
          <p>© {new Date().getFullYear()} Imogine - All Rights Reserved</p>
        </Segment>
        
        <Modal
          basic
          open={isModalOpen}
          onClose={() => {
            const audioElement = document.getElementById('recording-audio');
            if (audioElement) audioElement.pause();
            setIsModalOpen(false);
            setSelectedRecording(null); // Clear selection on close
          }}
          size='small'
          className="recording-modal"
        >
          <Header icon>
            <Icon name='sound' />
            Session Recording
          </Header>
          <Modal.Content>
            {selectedRecording && (
              <div style={{ textAlign: 'center' }}>
                <audio 
                  id="recording-audio"
                  controls 
                  autoPlay // Try autoplaying
                  src={selectedRecording}
                  style={{ width: '100%' }}
                  onError={(e) => {
                    console.error('Audio playback error:', e);
                    console.error('Audio element error details:', e.target.error);
                    let errorMessage = 'Error playing the recording. ';
                    if (e.target.error) {
                      switch (e.target.error.code) {
                        case e.target.error.MEDIA_ERR_ABORTED: errorMessage += 'Playback aborted.'; break;
                        case e.target.error.MEDIA_ERR_NETWORK: errorMessage += 'Network error.'; break;
                        case e.target.error.MEDIA_ERR_DECODE: errorMessage += 'Decoding error.'; break;
                        case e.target.error.MEDIA_ERR_SRC_NOT_SUPPORTED: errorMessage += 'Format not supported or file not found.'; break;
                        default: errorMessage += 'Unknown error.';
                      }
                    }
                    // Use a less intrusive way to show error, maybe a Message component
                    alert(errorMessage); 
                  }}
                />
                <div style={{ marginTop: '1rem', color: 'rgba(255, 255, 255, 0.8)' }}>
                  <p>Playback should start automatically. If not, please use the controls.</p>
                </div>
              </div>
            )}
          </Modal.Content>
          <Modal.Actions>
            <Button color='green' inverted onClick={() => setIsModalOpen(false)}>
              <Icon name='close' /> Close
            </Button>
          </Modal.Actions>
        </Modal>
        
        {isLoading && (
          <Dimmer active page>
            <Loader size='large' inverted content='Preparing Your Session...' />
          </Dimmer>
        )}
      </Container>
    </div>
  );
}

export default Dashboard;