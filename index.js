import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// In-memory store for online users and scores
let onlineUsers = {};
let userScores = {};
let quizRestartVersion = Date.now(); // timestamp for quiz restart
const USER_TIMEOUT = 12000; // 12 seconds

function cleanupUsers() {
  const now = Date.now();
  for (const username in onlineUsers) {
    if (now - onlineUsers[username].lastSeen > USER_TIMEOUT) {
      delete onlineUsers[username];
      delete userScores[username];
    }
  }
}

app.post('/api/join', (req, res) => {
  const { username } = req.body;
  if (username) {
    onlineUsers[username] = { lastSeen: Date.now() };
    if (!(username in userScores)) {
      userScores[username] = 0;
    }
    res.json({ success: true });
  } else {
    res.status(400).json({ error: 'Username required' });
  }
});

app.get('/api/online-users', (req, res) => {
  // Update lastSeen for polling user if username is provided
  const username = req.query.username;
  if (username && onlineUsers[username]) {
    onlineUsers[username].lastSeen = Date.now();
  }
  cleanupUsers();
  res.json({ users: Object.keys(onlineUsers), scores: userScores, quizRestartVersion });
});

app.post('/api/score', (req, res) => {
  const { username } = req.body;
  if (username && username in userScores) {
    userScores[username] += 1;
    res.json({ success: true, score: userScores[username] });
  } else {
    res.status(400).json({ error: 'Invalid user' });
  }
});

app.post('/api/reset-scores', (req, res) => {
  Object.keys(userScores).forEach(u => {
    userScores[u] = 0;
  });
  quizRestartVersion = Date.now(); // update restart version
  res.json({ success: true });
});

app.get('/api/quiz', (req, res) => {
  const quizPath = path.join(__dirname, 'quiz-data.json');
  fs.readFile(quizPath, 'utf8', (err, data) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to load quiz data' });
    }
    res.json(JSON.parse(data));
  });
});

app.listen(PORT, () => {
  console.log(`Quiz backend running on http://localhost:${PORT}`);
});
