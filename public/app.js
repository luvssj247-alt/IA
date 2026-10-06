const messagesEl = document.getElementById('messages');
const statusEl = document.getElementById('status');
const formEl = document.getElementById('chatForm');
const inputEl = document.getElementById('userInput');
const apiKeyInput = document.getElementById('apiKeyInput');
const saveApiKeyBtn = document.getElementById('saveApiKeyBtn');
const apiKeyStatus = document.getElementById('apiKeyStatus');

const history = [
  {
    role: 'assistant',
    content: 'Hola. Puedo ayudarte con roleplay, memoria y verificación factual. Si haces una pregunta real, buscaré y contrastaré fuentes antes de responder.',
  },
];

function renderMessages() {
  messagesEl.innerHTML = '';
  history.forEach((entry) => {
    const wrap = document.createElement('div');
    wrap.className = `message ${entry.role}`;
    const label = document.createElement('span');
    label.className = 'label';
    label.textContent = entry.role === 'assistant' ? 'IA' : 'Tú';
    const body = document.createElement('div');
    body.textContent = entry.content;
    wrap.appendChild(label);
    wrap.appendChild(body);
    messagesEl.appendChild(wrap);
  });

  messagesEl.scrollTop = messagesEl.scrollHeight;
}

function showStatus(message, type = 'info') {
  statusEl.textContent = message;
  statusEl.classList.toggle('warning', type === 'warning');
}

async function refreshApiKeyStatus() {
  try {
    const res = await fetch('/api/api-key-status');
    const payload = await res.json();
    if (payload && payload.ok) {
      if (payload.hasKey) {
        apiKeyStatus.textContent = `Clave establecida: ${payload.masked}`;
        apiKeyInput.value = '';
      } else {
        apiKeyStatus.textContent = 'No hay clave configurada.';
      }
    } else {
      apiKeyStatus.textContent = 'No se pudo consultar el estado de la clave.';
    }
  } catch (err) {
    apiKeyStatus.textContent = 'Error al consultar estado de la clave.';
  }
}

async function saveApiKey() {
  const key = apiKeyInput.value.trim();
  if (!key) {
    alert('Introduce una clave válida.');
    return;
  }

  // Send key to server to keep it in memory (not persisted on disk).
  try {
    const res = await fetch('/api/set-api-key', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key }),
    });

    const payload = await res.json();
    if (!res.ok || !payload.ok) {
      alert(payload.error || 'No se pudo guardar la clave.');
      return;
    }

    apiKeyInput.value = '';
    apiKeyStatus.textContent = `Clave establecida: ${payload.masked}`;
    showStatus('Clave guardada en memoria.');
  } catch (err) {
    console.error('saveApiKey error', err);
    alert('Error al guardar la clave en el servidor.');
  }
}

async function sendMessage(event) {
  event.preventDefault();
  const text = inputEl.value.trim();
  if (!text) return;

  history.push({ role: 'user', content: text });
  renderMessages();
  inputEl.value = '';
  showStatus('Preparando la respuesta...', 'info');

  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ messages: history }),
    });

    const payload = await response.json();
    if (!response.ok || !payload.ok) {
      throw new Error(payload.detail || payload.error || 'No se pudo completar la petición.');
    }

    const assistantMessage = payload.response || 'No tengo respuesta disponible.';
    history.push({ role: 'assistant', content: assistantMessage });

    if (Array.isArray(payload.sources) && payload.sources.length > 0) {
      const sourcesWrap = document.createElement('div');
      sourcesWrap.classList.add('sources');
      const title = document.createElement('h4');
      title.textContent = 'Fuentes consultadas';
      const list = document.createElement('ul');

      payload.sources.forEach((source) => {
        const item = document.createElement('li');
        item.innerHTML = `<strong>${source.title || 'Fuente'}</strong> — ${source.domain || 'sin dominio'}<br><a href="${source.url}" target="_blank" rel="noreferrer">${source.url}</a>`;
        list.appendChild(item);
      });

      sourcesWrap.appendChild(title);
      sourcesWrap.appendChild(list);
      messagesEl.appendChild(sourcesWrap);
    }

    if (Array.isArray(payload.warnings) && payload.warnings.length > 0) {
      const warning = document.createElement('div');
      warning.className = 'warning';
      warning.textContent = payload.warnings.join(' ');
      messagesEl.appendChild(warning);
    }

    renderMessages();
    showStatus(payload.usedWebSearch ? 'Respuesta basada en fuentes externas.' : 'Respuesta generada con el contexto del chat.', 'info');
  } catch (error) {
    console.error(error);
    history.push({
      role: 'assistant',
      content: `No he podido procesar esta solicitud. ${error.message}`,
    });
    renderMessages();
    showStatus('Error del sistema: el modelo principal no está disponible o hay un problema con la consulta.', 'warning');
  }
}

formEl.addEventListener('submit', sendMessage);
saveApiKeyBtn.addEventListener('click', saveApiKey);

// On load
renderMessages();
refreshApiKeyStatus();
showStatus('Listo.', 'info');
