let _idCounter = 0;
function nextId() {
    return ++_idCounter;
}

export const state = $state({
    isLoggedIn: false,
    myEmail: '',
    signKeyPair: null,
    encryptKeyPair: null,
    serverUrl: '',
    activeContact: null,
    contacts: {},
    secretMode: false,
    searchQuery: '',
    connectionStatus: 'disconnected',
    toasts: [],
    showAddModal: false,
    newContactEmail: '',
    authLoading: false,
    authError: ''
});

export function addToast(message, type) {
    const id = nextId();
    state.toasts = [...state.toasts, { id, message, type }];
    setTimeout(() => {
        state.toasts = state.toasts.filter(t => t.id !== id);
    }, 2500);
}

export function login(email, signKeyPair, encryptKeyPair) {
    state.myEmail = email;
    state.signKeyPair = signKeyPair;
    state.encryptKeyPair = encryptKeyPair;
    state.isLoggedIn = true;
}

export function addContact(email) {
    if (!state.contacts[email]) {
        state.contacts = {
            ...state.contacts,
            [email]: { publicKeys: null, messages: [] }
        };
    }
}

export function setContactKeys(email, encPubKey, signPubKey) {
    const contact = state.contacts[email];
    if (contact) {
        contact.publicKeys = { enc: encPubKey, sign: signPubKey };
        state.contacts = { ...state.contacts };
    }
}

export function addMessage(email, msg) {
    const contact = state.contacts[email];
    if (contact) {
        contact.messages = [...contact.messages, msg];
        state.contacts = { ...state.contacts };
    }
}

export function clearActiveMessages() {
    if (state.activeContact && state.contacts[state.activeContact]) {
        state.contacts[state.activeContact].messages = [];
        state.contacts = { ...state.contacts };
    }
}

export function selectContact(email) {
    state.activeContact = email;
    state.searchQuery = '';
}

export function setConnectionStatus(status) {
    state.connectionStatus = status;
}

export function setSearchQuery(query) {
    state.searchQuery = query;
}

export function toggleSecretMode() {
    state.secretMode = !state.secretMode;
}

export function updateMessageStatus(email, clientMsgId, serverId, status) {
    const contact = state.contacts[email];
    if (contact) {
        contact.messages = contact.messages.map(m => {
            if (m.clientMsgId === clientMsgId) {
                return { ...m, id: serverId, status };
            }
            return m;
        });
        state.contacts = { ...state.contacts };
    }
}

export function updateMessageStatusByServerId(email, serverId, status) {
    const contact = state.contacts[email];
    if (contact) {
        contact.messages = contact.messages.map(m => {
            if (m.id === serverId) {
                return { ...m, status };
            }
            return m;
        });
        state.contacts = { ...state.contacts };
    }
}
