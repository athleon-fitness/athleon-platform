/**
 * Example App.js with all improvements integrated
 * Copy this structure to your actual App.js
 */


import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Authenticator } from '@aws-amplify/ui-react';
import { Amplify } from 'aws-amplify/api';
import awsExports from './aws-exports';

// Import new components
import ErrorBoundary from './components/common/ErrorBoundary';
import { NotificationProvider } from './components/common/NotificationProvider';

// Import existing components
import LandingPage from './components/LandingPage';
import BackofficeLayout from './components/BackofficeLayout';
import AthleteProfile from './components/AthleteProfile';
// ... other imports

// Configure Amplify
Amplify.configure(awsExports);

function App() {
  return (
    // 1. Wrap everything in ErrorBoundary to catch crashes
    <ErrorBoundary>
      {/* 2. Add NotificationProvider for toast notifications */}
      <NotificationProvider>
        <Router>
          <Authenticator.Provider>
            <Routes>
              {/* Public routes */}
              <Route path="/" element={<LandingPage />} />
              
              {/* Authenticated routes */}
              <Route
                path="/backoffice/*"
                element={
                  <Authenticator>
                    {({ signOut, user }) => (
                      <BackofficeLayout user={user} signOut={signOut} />
                    )}
                  </Authenticator>
                }
              />
              
              <Route
                path="/athlete/*"
                element={
                  <Authenticator>
                    {({ signOut, user }) => (
                      <AthleteProfile user={user} signOut={signOut} />
                    )}
                  </Authenticator>
                }
              />
              
              {/* Add more routes as needed */}
            </Routes>
          </Authenticator.Provider>
        </Router>
      </NotificationProvider>
    </ErrorBoundary>
  );
}

export default App;
