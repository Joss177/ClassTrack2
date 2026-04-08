if (document.getElementById('chatbotBtn')) {

// ─── Estado de la conversación ───────────────────────────────────────────────
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

// ─── Restaurar mensajes anteriores ───────────────────────────────────────────
function restoreMessages() {
    const history = getHistory();
    if (history.length === 0) return;

    // Oculta opciones rápidas si ya hay conversación
    quickOptions.style.display = 'none';

    // Renderiza el historial
    history.forEach(m => addMessage(m.content, m.role === 'user' ? 'user' : 'bot'));
}

// ─── Abrir / cerrar ventana ───────────────────────────────────────────────────
chatBtn.addEventListener('click', () => {
    chatWindow.classList.toggle('open');
    if (chatWindow.classList.contains('open')) {
        chatInput.focus();
        restoreMessages();
        if (!quickOptions.dataset.loaded) loadQuickOptions();
    }
});

chatClose.addEventListener('click', () => chatWindow.classList.remove('open'));

// ─── Cargar opciones rápidas desde el backend ─────────────────────────────────
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

// ─── Agregar mensaje al DOM ───────────────────────────────────────────────────
function addMessage(text, type) {
    const msg = document.createElement('div');
    msg.classList.add('chat-msg', ...type.split(' '));

    const formatted = text
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\n/g, '<br>');

    msg.innerHTML = `<span>${formatted}</span>`;
    chatMessages.appendChild(msg);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// ─── Indicador de escritura ───────────────────────────────────────────────────
function setTyping(active) {
    typingIndicator.style.display = active ? 'flex' : 'none';
    chatStatus.textContent = active ? 'Escribiendo...' : 'En línea';
    if (active) chatMessages.scrollTop = chatMessages.scrollHeight;
}

// ─── Enviar mensaje al backend FastAPI ───────────────────────────────────────
async function sendMessage(overrideText) {
    const text = (overrideText ?? chatInput.value).trim();
    if (!text) return;

    addMessage(text, 'user');
    chatInput.value    = '';
    chatInput.disabled = true;
    chatSend.disabled  = true;
    setTyping(true);

    const history = getHistory();
    history.push({ role: 'user', content: text });
    saveHistory(history);

    try {
        const res = await fetch('/api/chatbot/message', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({
                message: text,
                history: history.slice(0, -1)
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

// ─── Eventos ──────────────────────────────────────────────────────────────────
chatSend.addEventListener('click', () => sendMessage());
chatInput.addEventListener('keydown', e => { if (e.key === 'Enter') sendMessage(); });

} // fin if chatbotBtn