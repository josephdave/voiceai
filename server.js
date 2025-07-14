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

// Audio queue management
let audioQueue = [];
let isProcessing = false;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Function to convert text to speech
async function convertTextToSpeech(text) {
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
  return audioBuffer.toString('base64');
}

// Process audio queue
async function processAudioQueue() {
  if (isProcessing || audioQueue.length === 0) {
    return;
  }

  isProcessing = true;
  console.log(`Processing queue. Items remaining: ${audioQueue.length}`);

  const { text, timestamp } = audioQueue.shift();
  
  try {
    console.log('Converting text to speech:', text);
    
    // Notify clients that audio is being processed
    io.emit('queue_status', { 
      status: 'processing', 
      remaining: audioQueue.length,
      current: text.substring(0, 50) + (text.length > 50 ? '...' : '')
    });

    const audioBase64 = await convertTextToSpeech(text);
    
    // Send audio to clients
    io.emit('audio', { audio: audioBase64, text });
    
    // Wait for audio duration + buffer time before processing next item
    // Estimate: ~100ms per character as rough audio duration
    const estimatedDuration = Math.max(2000, text.length * 100);
    
    setTimeout(() => {
      isProcessing = false;
      processAudioQueue(); // Process next item
    }, estimatedDuration);
    
  } catch (error) {
    console.error('Error converting text to speech:', error.response?.data || error.message);
    isProcessing = false;
    
    // Notify clients of error
    io.emit('queue_status', { 
      status: 'error', 
      remaining: audioQueue.length,
      error: 'Failed to convert text to speech'
    });
    
    // Continue processing queue after error
    setTimeout(() => {
      processAudioQueue();
    }, 1000);
  }
}

app.post('/api/speak', async (req, res) => {
  try {
    const { text } = req.body;
    
    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }

    // Add to queue
    audioQueue.push({
      text: text,
      timestamp: Date.now()
    });

    console.log(`Added to queue: "${text.substring(0, 50)}${text.length > 50 ? '...' : ''}" (Queue size: ${audioQueue.length})`);
    
    // Notify clients about queue status
    io.emit('queue_status', { 
      status: 'queued', 
      remaining: audioQueue.length,
      position: audioQueue.length
    });
    
    // Start processing if not already processing
    processAudioQueue();
    
    res.json({ 
      success: true, 
      message: 'Audio queued for processing',
      queuePosition: audioQueue.length,
      queueSize: audioQueue.length
    });
    
  } catch (error) {
    console.error('Error queuing audio:', error.message);
    res.status(500).json({ error: 'Failed to queue audio' });
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