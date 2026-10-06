require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');
const { processChatRequest } = require('./src/chatHandler');
const { getMemorySnapshot } = require('./src/memoryStore');
const { setKey, hasKey, getMaskedKey } = require('./src/secretsStore');

const app = express();
const PORT = Number(process.env.PORT || 3000);

app.use(cors());
app.use(express.json({ limit: '20mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Endpoint to set the OpenRouter API key at runtime (kept in memory only).
app.post('/api/set-api-key', (req, res) => {
  try {
    const key = req.body && req.body.key;
    if (!key || typeof key !== 'string' || !key.trim()) {
      return res.status(400).json({ ok: false, error: 'Falta la clave en el cuerpo (key).' });
    }
    // Do not log the key.
    setKey(key.trim());
    return res.json({ ok: true, masked: getMaskedKey(), message: 'Clave guardada en memoria (no persistida).' });
  } catch (err) {
    console.error('set-api-key error:', err?.message || err);
    return res.status(500).json({ ok: false, error: 'Error al guardar la clave.' });
  }
});

app.get('/api/api-key-status', (_req, res) => {
  try {
    return res.json({ ok: true, hasKey: hasKey(), masked: getMaskedKey() });
  } catch (err) {
    return res.status(500).json({ ok: false, error: 'Error al consultar el estado de la clave.' });
  }
});

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    model: 'meta-llama/llama-3-8b-instruct:free',
    memory: getMemorySnapshot(),
    apiKeySet: hasKey(),
    apiKeyMasked: getMaskedKey(),
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
    console.error('chat error:', error?.message || error);
    res.status(500).json({
      ok: false,
      error: 'No se pudo procesar la conversación.',
      detail: error?.message || String(error),
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
