if (document.getElementById('chatbotBtn')) {

// ─── Estado ──────────────────────────────────────────────────────────────────
function getHistory() {
    return JSON.parse(sessionStorage.getItem('chatHistory') || '[]');
}
function saveHistory(history) {
    sessionStorage.setItem('chatHistory', JSON.stringify(history));
}

// ─── Referencias DOM ─────────────────────────────────────────────────────────
const chatBtn         = document.getElementById('chatbotBtn');
const chatWindow      = document.getElementById('chatWindow');
const chatClose       = document.getElementById('chatClose');
const chatInput       = document.getElementById('chatInput');
const chatSend        = document.getElementById('chatSend');
const chatMessages    = document.getElementById('chatMessages');
const quickOptions    = document.getElementById('quickOptions');
const typingIndicator = document.getElementById('typingIndicator');
const chatStatus      = document.getElementById('chatStatus');

// ─── Restaurar historial ──────────────────────────────────────────────────────
function restoreMessages() {
    const history = getHistory();
    if (history.length === 0) return;
    quickOptions.style.display = 'none';
    // Limpia mensajes previos para no duplicar al reabrir
    const mensajesExistentes = chatMessages.querySelectorAll('.chat-msg');
    mensajesExistentes.forEach(m => m.remove());
    history.forEach(m => addMessage(m.content, m.role === 'user' ? 'user' : 'bot'));
}

// ─── Abrir / cerrar ───────────────────────────────────────────────────────────
chatBtn.addEventListener('click', () => {
    chatWindow.classList.toggle('open');
    if (chatWindow.classList.contains('open')) {
        chatInput.focus();
        restoreMessages();
        if (!quickOptions.dataset.loaded) loadQuickOptions();
    }
});

chatClose.addEventListener('click', () => chatWindow.classList.remove('open'));

// ─── Opciones rápidas ─────────────────────────────────────────────────────────
async function loadQuickOptions() {
    try {
        const res  = await fetch('/api/chatbot/options');
        const data = await res.json();
        data.options.forEach(opt => {
            const btn = document.createElement('button');
            btn.classList.add('quick-option-btn');
            btn.textContent = opt.label;
            btn.addEventListener('click', () => {
                quickOptions.style.display = 'none';
                sendMessage(opt.message);
            });
            quickOptions.appendChild(btn);
        });
        quickOptions.dataset.loaded = 'true';
    } catch (err) {
        console.error('Error cargando opciones rápidas:', err);
    }
}

// ─── Renderizar mensaje ───────────────────────────────────────────────────────
function addMessage(text, type) {
    const msg = document.createElement('div');
    msg.classList.add('chat-msg', ...type.split(' '));

    // Soporte básico de Markdown: negrita y saltos de línea
    const formatted = text
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/\n/g, '<br>');

    msg.innerHTML = `<span>${formatted}</span>`;
    chatMessages.appendChild(msg);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// ─── Typing indicator ─────────────────────────────────────────────────────────
function setTyping(active) {
    typingIndicator.style.display = active ? 'flex' : 'none';
    chatStatus.textContent = active ? 'Consultando sistema...' : 'En línea';
    if (active) chatMessages.scrollTop = chatMessages.scrollHeight;
}

// ─── Enviar mensaje ───────────────────────────────────────────────────────────
async function sendMessage(overrideText) {
    const text = (overrideText ?? chatInput.value).trim();
    if (!text) return;

    // Ocultar opciones rápidas al primer mensaje
    quickOptions.style.display = 'none';

    addMessage(text, 'user');
    chatInput.value    = '';
    chatInput.disabled = true;
    chatSend.disabled  = true;
    setTyping(true);

    // Guardar mensaje del usuario en historial
    const history = getHistory();
    history.push({ role: 'user', content: text });
    saveHistory(history);

    try {
        const res = await fetch('/api/chatbot/message', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message: text,
                history: history.slice(0, -1)  // historial previo sin el actual
            })
        });

        const data = await res.json();
        setTyping(false);

        if (!res.ok) {
            addMessage(`⚠️ ${data.detail || 'Error al obtener respuesta.'}`, 'bot error');
        } else {
            addMessage(data.response, 'bot');
            const updatedHistory = getHistory();
            updatedHistory.push({ role: 'assistant', content: data.response });
            saveHistory(updatedHistory);
        }

    } catch (err) {
        setTyping(false);
        addMessage('⚠️ No pude conectarme al servidor. Verifica tu conexión.', 'bot error');
        console.error('Error chatbot:', err);
    } finally {
        chatInput.disabled = false;
        chatSend.disabled  = false;
        chatInput.focus();
    }
}

// ─── Botón limpiar chat ───────────────────────────────────────────────────────
// Opcional: agrega un botón con id="chatClear" en tu HTML para resetear
const chatClear = document.getElementById('chatClear');
if (chatClear) {
    chatClear.addEventListener('click', () => {
        sessionStorage.removeItem('chatHistory');
        const mensajes = chatMessages.querySelectorAll('.chat-msg');
        mensajes.forEach(m => m.remove());
        quickOptions.style.display = '';
        quickOptions.dataset.loaded = '';
        quickOptions.innerHTML = '';
        loadQuickOptions();
    });
}

// ─── Eventos ──────────────────────────────────────────────────────────────────
chatSend.addEventListener('click', () => sendMessage());
chatInput.addEventListener('keydown', e => { if (e.key === 'Enter') sendMessage(); });

} // fin if chatbotBtn