import React from 'react';
import { ApolloProvider } from '@apollo/client';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import client from './apollo-client';
import Dashboard from './pages/Dashboard';
import SessionPage from './pages/SessionPage';
import { ErrorBoundary } from 'react-error-boundary';

function ErrorFallback({error}) {
  return (
    <div role="alert">
      <h2>Something went wrong:</h2>
      <pre style={{color: 'red'}}>{error.message}</pre>
    </div>
  )
}

function App() {
  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <ApolloProvider client={client}>
        <Router>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/session/:sessionId" element={<SessionPage />} />
          </Routes>
        </Router>
      </ApolloProvider>
    </ErrorBoundary>
  );
}

export default App;
