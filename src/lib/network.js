import { toHex, fromHex, getTime, isSecretKey } from './utils.js';
import { decryptMessage, generateKeyPair, signPayload } from './crypto.js';
import { state, addToast, addContact, setContactKeys, addMessage, setConnectionStatus, selectContact, login, updateMessageStatus, updateMessageStatusByServerId } from './chat.svelte.js';

let ws = null;
let reconnectTimer = null;

// Persistent session credentials strictly in memory for secure auto-reconnections
let savedUrl = '';
let savedEmail = '';
let savedPassword = '';
let savedMode = '';
let savedSeed = null;

let savedSignKeyPair = null;
let savedEncryptKeyPair = null;

export function connectServer(url, email, password, mode, seed) {
    savedUrl = url;
    savedEmail = email;
    savedPassword = password;
    savedMode = mode;
    savedSeed = seed;

    if (seed) {
        const keys = generateKeyPair(seed);
        savedSignKeyPair = keys.sign;
        savedEncryptKeyPair = keys.encrypt;
    }

    if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
    }

    setConnectionStatus('connecting');
    ws = new WebSocket(url);

    ws.onopen = () => {
        setConnectionStatus('connected');
        
        if (savedMode === 'register') {
            // New user registration (sends password hash + public keys to register)
            ws.send(JSON.stringify({
                type: 'register',
                email: savedEmail,
                password: savedPassword,
                signPubKey: toHex(savedSignKeyPair.publicKey),
                encPubKey: toHex(savedEncryptKeyPair.publicKey)
            }));
        } else {
            // Log In / Reconnection: request a cryptographic challenge from the server
            ws.send(JSON.stringify({
                type: 'auth_challenge_req',
                email: savedEmail
            }));
        }
    };

    ws.onclose = () => {
        setConnectionStatus('disconnected');
        // Auto-reconnect in the background using in-memory keys
        if (savedEmail) {
            reconnectTimer = setTimeout(() => {
                connectServer(savedUrl, savedEmail, savedPassword, savedMode, savedSeed);
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
    savedMode = '';
    savedSeed = null;
    savedSignKeyPair = null;
    savedEncryptKeyPair = null;
    if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
    }
}

function handleIncomingMessage(msg) {
    if (msg.type === 'auth_challenge') {
        // Cryptographic Challenge-Response Signature Handshake
        try {
            const challengeBytes = fromHex(msg.ciphertext);
            const signatureBytes = signPayload(challengeBytes, savedSignKeyPair.secretKey);
            
            console.log('Signing server challenge with private identity key...');
            wsSend({
                type: 'auth_response',
                email: savedEmail,
                signature: toHex(signatureBytes)
            });
        } catch (e) {
            console.error('Failed to sign auth challenge:', e);
            state.authLoading = false;
            state.authError = 'Key signing error';
            clearCredentials();
        }

    } else if (msg.type === 'registered') {
        console.log('Authenticated successfully via Challenge-Response:', msg.email);
        
        // Successful login transition
        if (!state.isLoggedIn) {
            login(savedEmail, savedSignKeyPair, savedEncryptKeyPair);
            addToast('Connected to secure session', 'success');
        }
        
        state.authLoading = false;
        state.authError = '';

        // Save email & server URL to localStorage (no keys, seed or password stored on disk for maximum security!)
        try {
            localStorage.setItem('cl_chat_email', savedEmail);
            localStorage.setItem('cl_chat_server_url', savedUrl);
        } catch (_) {}

    } else if (msg.type === 'sent_confirm') {
        updateMessageStatus(msg.recipient, msg.clientMsgId, msg.id, 'sent');

    } else if (msg.type === 'delivery_confirm') {
        updateMessageStatusByServerId(msg.recipient, msg.id, 'delivered');

    } else if (msg.type === 'lookup_response') {
        setContactKeys(msg.email, fromHex(msg.encPubKey), fromHex(msg.signPubKey));
        addToast(`Keys received for ${msg.email}`, 'success');
        selectContact(msg.email);

    } else if (msg.type === 'message') {
        // Send ACK back to server immediately so it can delete the message from the queue and notify the sender
        if (msg.id) {
            wsSend({ type: 'ack', id: msg.id, sender: msg.sender });
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
