import { toHex, fromHex, getTime, isSecretKey } from './utils.js';
import { decryptMessage } from './crypto.js';
import { state, addToast, addContact, setContactKeys, addMessage, setConnectionStatus, selectContact } from './chat.svelte.js';

let ws = null;
let reconnectTimer = null;

export function connectServer(url) {
    setConnectionStatus('connecting');
    ws = new WebSocket(url);

    ws.onopen = () => {
        setConnectionStatus('connected');
        ws.send(JSON.stringify({
            type: 'register',
            email: state.myEmail,
            signPubKey: toHex(state.signKeyPair.publicKey),
            encPubKey: toHex(state.encryptKeyPair.publicKey)
        }));
    };

    ws.onclose = () => {
        setConnectionStatus('disconnected');
        reconnectTimer = setTimeout(() => connectServer(url), 3000);
    };

    ws.onerror = (err) => {
        console.error('WS error', err);
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

function handleIncomingMessage(msg) {
    if (msg.type === 'registered') {
        console.log('Registered as', msg.email);
    } else if (msg.type === 'lookup_response') {
        setContactKeys(msg.email, fromHex(msg.encPubKey), fromHex(msg.signPubKey));
        addToast(`Keys received for ${msg.email}`, 'success');
        selectContact(msg.email);
    } else if (msg.type === 'message') {
        const sender = msg.sender;
        addContact(sender);
        if (!state.contacts[sender].publicKeys) {
            lookupContact(sender);
            setTimeout(() => handleDecryption(msg), 500);
        } else {
            handleDecryption(msg);
        }
    } else if (msg.type === 'error') {
        addToast('Server Error: ' + msg.error, 'error');
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
