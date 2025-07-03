require('dotenv').config();

const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const axios = require('axios');
const cors = require('cors');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3000;
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const VOICE_ID = process.env.VOICE_ID;
const ELEVENLABS_API_URL = process.env.ELEVENLABS_API_URL;
const MODEL_ID = process.env.MODEL_ID;
const VOICE_STABILITY = parseFloat(process.env.VOICE_STABILITY) || 0.5;
const VOICE_SIMILARITY_BOOST = parseFloat(process.env.VOICE_SIMILARITY_BOOST) || 0.5;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.post('/api/speak', async (req, res) => {
  try {
    const { text } = req.body;
    
    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }

    console.log('Converting text to speech:', text);

    const response = await axios.post(
      `${ELEVENLABS_API_URL}/${VOICE_ID}`,
      {
        text: text,
        model_id: MODEL_ID,
        voice_settings: {
          stability: VOICE_STABILITY,
          similarity_boost: VOICE_SIMILARITY_BOOST
        }
      },
      {
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': ELEVENLABS_API_KEY
        },
        responseType: 'arraybuffer'
      }
    );

    const audioBuffer = Buffer.from(response.data);
    const audioBase64 = audioBuffer.toString('base64');
    
    io.emit('audio', { audio: audioBase64 });
    
    res.json({ success: true, message: 'Audio sent to clients' });
  } catch (error) {
    console.error('Error converting text to speech:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to convert text to speech' });
  }
});

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Open http://localhost:${PORT} in your browser`);
});