require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');
const { processChatRequest } = require('./src/chatHandler');
const { getMemorySnapshot } = require('./src/memoryStore');

const app = express();
const PORT = Number(process.env.PORT || 3000);

app.use(cors());
app.use(express.json({ limit: '20mb' }));
app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    model: 'meta-llama/llama-3-8b-instruct:free',
    memory: getMemorySnapshot(),
    timestamp: new Date().toISOString(),
  });
});

app.post('/api/chat', async (req, res) => {
  try {
    const payload = req.body || {};
    const messages = Array.isArray(payload.messages) ? payload.messages : [];
    const memoryOverride = payload.memory || null;

    const result = await processChatRequest({
      messages,
      memoryOverride,
      requestSource: 'http',
    });

    res.json(result);
  } catch (error) {
    console.error('chat error:', error);
    res.status(500).json({
      ok: false,
      error: 'No se pudo procesar la conversación.',
      detail: error.message,
    });
  }
});

app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Servidor escuchando en http://localhost:${PORT}`);
  console.log('Modelo por defecto: meta-llama/llama-3-8b-instruct:free');
});
