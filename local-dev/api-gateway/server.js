const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

// Mock API responses for local development
const mockResponses = {
  '/organizations': { organizations: [] },
  '/competitions': { events: [] },
  '/athletes': { athletes: [] },
  '/scores': { scores: [] },
  '/categories': { categories: [] },
  '/wods': { wods: [] }
};

// Simple mock handler
app.all('*', (req, res) => {
  console.log(`${req.method} ${req.path}`);
  
  // CORS headers
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Find matching mock response
  const mockKey = Object.keys(mockResponses).find(key => req.path.startsWith(key));
  const response = mockKey ? mockResponses[mockKey] : { message: 'Local API response', path: req.path };
  
  res.json(response);
});

app.listen(3001, () => console.log('🚀 Local API running on port 3001'));
