const STORAGE_KEY = 'ia_roleplay_history_v1';

const messagesEl = document.getElementById('messages');
const statusEl = document.getElementById('status');
const formEl = document.getElementById('chatForm');
const inputEl = document.getElementById('userInput');

const apiKeyInput = document.getElementById('apiKeyInput');
const saveApiKeyBtn = document.getElementById('saveApiKeyBtn');
const apiKeyStatus = document.getElementById('apiKeyStatus');

const chatListEl = document.getElementById('chatList');
const newChatBtn = document.getElementById('newChatBtn');
const clearChatBtn = document.getElementById('clearChatBtn');
const deleteChatBtn = document.getElementById('deleteChatBtn');
const clearAllChatsBtn = document.getElementById('clearAllChatsBtn');

let chats = loadChats();
let activeChatId = chats[0]?.id || null;

function createWelcomeMessage() {
  return {
    role: 'assistant',
    content: 'Hola. Puedo ayudarte con roleplay, memoria y verificación factual. Si haces una pregunta real, buscaré y contrastaré fuentes antes de responder.',
  };
}

function createChat() {
  return {
    id: (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : `chat-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    title: 'Nueva conversación',
    messages: [createWelcomeMessage()],
  };
}

function loadChats() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [createChat()];

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) return [createChat()];
    return parsed;
  } catch (_error) {
    return [createChat()];
  }
}

function saveChats() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(chats));
}

function getActiveChat() {
  if (!activeChatId) {
    activeChatId = chats[0]?.id || null;
  }

  return chats.find((chat) => chat.id === activeChatId) || chats[0] || null;
}

function updateChatTitleFromMessages(chat) {
  if (!chat) return;

  const firstUserMessage = chat.messages.find((message) => message && message.role === 'user' && message.content);
  if (!firstUserMessage) {
    chat.title = 'Nueva conversación';
    return;
  }

  const text = String(firstUserMessage.content).trim();
  chat.title = text.length > 24 ? `${text.slice(0, 24)}...` : text;
}

function renderChatList() {
  chatListEl.innerHTML = '';

  chats.forEach((chat) => {
    const item = document.createElement('button');
    item.type = 'button';
    item.className = 'chat-item';
    if (chat.id === activeChatId) {
      item.classList.add('active');
    }

    const preview = document.createElement('div');
    preview.className = 'chat-item-preview';
    preview.textContent = chat.title || 'Nueva conversación';
    item.appendChild(preview);

    item.addEventListener('click', () => {
      activeChatId = chat.id;
      renderChatList();
      renderMessages();
    });

    chatListEl.appendChild(item);
  });
}

function renderMessages() {
  const chat = getActiveChat();
  messagesEl.innerHTML = '';

  if (!chat || !Array.isArray(chat.messages) || chat.messages.length === 0) {
    return;
  }

  chat.messages.forEach((entry) => {
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
      return;
    }

    apiKeyStatus.textContent = 'No se pudo consultar el estado de la clave.';
  } catch (_error) {
    apiKeyStatus.textContent = 'Error al consultar estado de la clave.';
  }
}

async function saveApiKey() {
  const key = apiKeyInput.value.trim();
  if (!key) {
    alert('Introduce una clave válida.');
    return;
  }

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
  } catch (error) {
    console.error('saveApiKey error', error);
    alert('Error al guardar la clave en el servidor.');
  }
}

function createNewChat() {
  const newChat = createChat();
  chats.unshift(newChat);
  activeChatId = newChat.id;
  saveChats();
  renderChatList();
  renderMessages();
  showStatus('Nueva conversación creada.', 'info');
}

function clearCurrentChat() {
  const chat = getActiveChat();
  if (!chat) return;

  chat.messages = [createWelcomeMessage()];
  chat.title = 'Nueva conversación';
  saveChats();
  renderMessages();
  renderChatList();
  showStatus('Conversación vaciada.', 'info');
}

function deleteCurrentChat() {
  if (!chats.length) return;

  const index = chats.findIndex((chat) => chat.id === activeChatId);
  if (index === -1) return;

  chats.splice(index, 1);

  if (!chats.length) {
    const fresh = createChat();
    chats.push(fresh);
    activeChatId = fresh.id;
  } else {
    activeChatId = chats[0].id;
  }

  saveChats();
  renderChatList();
  renderMessages();
  showStatus('Historial borrado.', 'info');
}

function clearAllChats() {
  const confirmed = window.confirm('¿Seguro que quieres vaciar todo el historial?');
  if (!confirmed) return;

  chats = [createChat()];
  activeChatId = chats[0].id;
  saveChats();
  renderChatList();
  renderMessages();
  showStatus('Todo el historial ha sido borrado.', 'info');
}

async function sendMessage(event) {
  event.preventDefault();
  const text = inputEl.value.trim();
  if (!text) return;

  const chat = getActiveChat();
  if (!chat) return;

  chat.messages.push({ role: 'user', content: text });
  updateChatTitleFromMessages(chat);
  saveChats();

  renderMessages();
  renderChatList();
  inputEl.value = '';
  showStatus('Preparando la respuesta...', 'info');

  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: chat.messages }),
    });

    const payload = await response.json();
    if (!response.ok || !payload.ok) {
      throw new Error(payload.detail || payload.error || 'No se pudo completar la petición.');
    }

    const assistantMessage = payload.response || 'No tengo respuesta disponible.';
    chat.messages.push({ role: 'assistant', content: assistantMessage });
    updateChatTitleFromMessages(chat);
    saveChats();

    renderMessages();
    renderChatList();
    showStatus(payload.usedWebSearch ? 'Respuesta basada en fuentes externas.' : 'Respuesta generada con el contexto del chat.', 'info');
  } catch (error) {
    console.error(error);
    chat.messages.push({
      role: 'assistant',
      content: `No he podido procesar esta solicitud. ${error.message}`,
    });
    updateChatTitleFromMessages(chat);
    saveChats();
    renderMessages();
    renderChatList();
    showStatus('Error del sistema: el modelo principal no está disponible o hay un problema con la consulta.', 'warning');
  }
}

formEl.addEventListener('submit', sendMessage);
saveApiKeyBtn.addEventListener('click', saveApiKey);
newChatBtn.addEventListener('click', createNewChat);
clearChatBtn.addEventListener('click', clearCurrentChat);
deleteChatBtn.addEventListener('click', deleteCurrentChat);
clearAllChatsBtn.addEventListener('click', clearAllChats);

renderChatList();
renderMessages();
refreshApiKeyStatus();
showStatus('Listo.', 'info');
