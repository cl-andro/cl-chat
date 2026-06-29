import { toHex, fromHex, getTime, isSecretKey } from './utils.js';
import { decryptMessage } from './crypto.js';
import { state, addToast, addContact, setContactKeys, addMessage, setConnectionStatus, selectContact, login } from './chat.svelte.js';

let ws = null;
let reconnectTimer = null;

// Persistent session credentials for auto-reconnection and authentication
let savedUrl = '';
let savedEmail = '';
let savedPassword = '';
let savedSignKeyPair = null;
let savedEncryptKeyPair = null;

export function connectServer(url, email, password, signKeyPair, encryptKeyPair) {
    // Save credentials internally for reconnect attempts
    savedUrl = url;
    savedEmail = email;
    savedPassword = password;
    savedSignKeyPair = signKeyPair;
    savedEncryptKeyPair = encryptKeyPair;

    if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
    }

    setConnectionStatus('connecting');
    ws = new WebSocket(url);

    ws.onopen = () => {
        setConnectionStatus('connected');
        // Authenticate with server using email and password, sending public keys
        ws.send(JSON.stringify({
            type: 'register',
            email: savedEmail,
            password: savedPassword,
            signPubKey: toHex(savedSignKeyPair.publicKey),
            encPubKey: toHex(savedEncryptKeyPair.publicKey)
        }));
    };

    ws.onclose = () => {
        setConnectionStatus('disconnected');
        // Auto-reconnect after 3 seconds if we still have credentials (meaning not logged out or rejected)
        if (savedEmail) {
            reconnectTimer = setTimeout(() => {
                connectServer(savedUrl, savedEmail, savedPassword, savedSignKeyPair, savedEncryptKeyPair);
            }, 3000);
        }
    };

    ws.onerror = (err) => {
        console.error('WS error', err);
        if (!state.isLoggedIn) {
            state.authLoading = false;
            state.authError = 'Connection failed. Make sure the server is online and running.';
            addToast('Could not connect to server', 'error');
            clearCredentials();
            if (ws) {
                ws.onclose = null;
                ws.close();
            }
            setConnectionStatus('disconnected');
        }
    };

    ws.onmessage = (event) => {
        try {
            const msg = JSON.parse(event.data);
            handleIncomingMessage(msg);
        } catch (e) {
            console.error('Message parse error', e);
        }
    };
}

export function wsSend(data) {
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(data));
        return true;
    }
    addToast('Not connected to server', 'error');
    return false;
}

export function lookupContact(email) {
    wsSend({ type: 'lookup', email });
}

export function clearCredentials() {
    savedUrl = '';
    savedEmail = '';
    savedPassword = '';
    savedSignKeyPair = null;
    savedEncryptKeyPair = null;
    if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
    }
}

function handleIncomingMessage(msg) {
    if (msg.type === 'registered') {
        console.log('Registered and authenticated successfully:', msg.email);
        
        // Successful login
        if (!state.isLoggedIn) {
            login(savedEmail, savedSignKeyPair, savedEncryptKeyPair);
            addToast('Connected to secure session', 'success');
        }
        
        state.authLoading = false;
        state.authError = '';

        // Save credentials to localStorage for instant second login!
        try {
            localStorage.setItem('cl_chat_email', savedEmail);
            localStorage.setItem('cl_chat_password', savedPassword);
            localStorage.setItem('cl_chat_server_url', savedUrl);
        } catch (_) {}

    } else if (msg.type === 'lookup_response') {
        setContactKeys(msg.email, fromHex(msg.encPubKey), fromHex(msg.signPubKey));
        addToast(`Keys received for ${msg.email}`, 'success');
        selectContact(msg.email);

    } else if (msg.type === 'message') {
        // Send ACK back to server immediately so it can delete the message from the queue
        if (msg.id) {
            wsSend({ type: 'ack', id: msg.id });
        }

        const sender = msg.sender;
        addContact(sender);
        if (!state.contacts[sender].publicKeys) {
            lookupContact(sender);
            setTimeout(() => handleDecryption(msg), 500);
        } else {
            handleDecryption(msg);
        }

    } else if (msg.type === 'error') {
        if (!state.isLoggedIn) {
            // Authentication failed during initial login/register!
            state.authLoading = false;
            state.authError = msg.error;
            addToast('Login Failed: ' + msg.error, 'error');
            
            // Clear credentials and close the socket to prevent reconnect loops
            clearCredentials();
            try {
                localStorage.removeItem('cl_chat_email');
                localStorage.removeItem('cl_chat_password');
            } catch (_) {}
            if (ws) {
                ws.onclose = null;
                ws.close();
            }
            setConnectionStatus('disconnected');
        } else {
            addToast('Server Error: ' + msg.error, 'error');
        }
    }
}

function handleDecryption(msg) {
    const sender = msg.sender;
    const contact = state.contacts[sender];
    if (!contact || !contact.publicKeys) {
        addMessage(sender, {
            sender,
            text: '[Unable to decrypt: public keys missing]',
            time: getTime(),
            isSecret: false
        });
        if (state.activeContact === sender) selectContact(sender);
        return;
    }

    try {
        const ciphertext = fromHex(msg.ciphertext);
        const nonce = fromHex(msg.nonce);
        const senderPubKey = contact.publicKeys.enc;

        const plaintext = decryptMessage(ciphertext, nonce, senderPubKey, state.encryptKeyPair.secretKey);
        if (!plaintext) throw new Error('Decryption failed');

        const isSecret = msg.isSecret === true || isSecretKey(plaintext);

        addMessage(sender, {
            sender,
            text: plaintext,
            time: getTime(),
            isSecret
        });
        addToast('New message from ' + sender, 'success');
    } catch (e) {
        console.error('Decryption error', e);
        addMessage(sender, {
            sender,
            text: '[Decryption Failed]',
            time: getTime(),
            isSecret: false
        });
    }
}
