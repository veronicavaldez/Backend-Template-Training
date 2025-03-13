import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from '@apollo/client';
import { START_SESSION } from '../graphql/operations';
import '../styles/Dashboard.css';
import musicLogo from '../assets/pngtree-music-logo-png-image_6389182.png';

const Dashboard = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  
  const [startSession] = useMutation(START_SESSION, {
    onCompleted: (data) => {
      setIsLoading(false);
      navigate(`/session/${data.startSession.id}`);
    },
    onError: (error) => {
      setIsLoading(false);
      console.error('Error starting session:', error);
      // You could add error handling UI here
    }
  });

  const handleStartSession = () => {
    setIsLoading(true);
    startSession();
  };

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <img src={musicLogo} className="app-logo" alt="Imogine logo" />
        <h1>Imogine</h1>
        <p className="tagline">Create music with your hands</p>
      </header>

      <main className="dashboard-main">
        <section className="intro-section">
          <h2>Welcome to Imogine</h2>
          <p>
            Transform your gestures into music with our AI-powered application.
            Use hand movements to control pitch, add harmonies, and apply effects in real-time.
          </p>
        </section>

        <section className="action-section">
          <button 
            className="start-session-btn"
            onClick={handleStartSession}
            disabled={isLoading}
          >
            {isLoading ? 'Starting...' : 'Start New Session'}
          </button>
          <div className="gesture-hint">
            <p>Ready to create? Just wave your hands to begin!</p>
          </div>
        </section>

        {/* This section would display recent sessions if you implement that feature */}
        <section className="recent-sessions">
          <h3>Recent Sessions</h3>
          <p className="placeholder-text">Your recent sessions will appear here</p>
          {/* Future implementation: List of recent sessions */}
        </section>
      </main>

      <footer className="dashboard-footer">
        <p>Imogine - AI-Powered Gesture-Based Music Creation</p>
      </footer>
    </div>
  );
};

export default Dashboard;