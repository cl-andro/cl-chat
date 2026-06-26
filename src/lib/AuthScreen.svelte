<script>
    import { deriveSeed, generateKeyPair } from './crypto.js';
    import { connectServer } from './network.js';
    import { state as chat, login, addToast } from './chat.svelte.js';

    let email = $state('');
    let password = $state('');
    let serverUrl = $state('wss://cl-chat.786313.xyz/ws');

    $effect(() => {
        try {
            const saved = localStorage.getItem('cl_chat_server_url');
            if (saved) serverUrl = saved;
        } catch (e) { /* noop */ }
    });

    async function handleAccess() {
        const e = email.trim().toLowerCase();
        const p = password;
        const s = serverUrl.trim();

        if (!e || !p || !s) {
            addToast('Please fill in all fields.', 'error');
            return;
        }

        try {
            localStorage.setItem('cl_chat_server_url', s);
        } catch (e) { /* noop */ }

        chat.authLoading = true;
        chat.authError = '';

        try {
            const derivedBytes = await deriveSeed(p, e);
            const keys = generateKeyPair(derivedBytes);
            login(e, keys.sign, keys.encrypt);
            connectServer(s);
        } catch (err) {
            chat.authError = err.message;
            addToast('Failed: ' + err.message, 'error');
            chat.authLoading = false;
        }
    }
</script>

<div class="glass-panel auth-screen">
    <div class="auth-logo">CL-CHAT</div>
    <div class="auth-subtitle">Zero-Knowledge, End-to-End Encrypted.<br>Key pairs derived entirely client-side.</div>

    <div class="input-group">
        <label class="input-label" for="emailInput">Email</label>
        <input type="email" id="emailInput" class="input-field" placeholder="alice@example.com" autocomplete="email" bind:value={email}>
    </div>

    <div class="input-group">
        <label class="input-label" for="passwordInput">Security Password</label>
        <input type="password" id="passwordInput" class="input-field" placeholder="Strong password (zero-recovery)" autocomplete="new-password" bind:value={password}>
    </div>

    <div class="input-group">
        <label class="input-label" for="serverUrlInput">Chat Server</label>
        <input type="text" id="serverUrlInput" class="input-field" placeholder="wss://cl-chat.786313.xyz/ws" bind:value={serverUrl}>
    </div>

    {#if !chat.authLoading}
        <button class="btn" onclick={handleAccess}>
            <span>Access Chat Console</span>
        </button>
    {:else}
        <div style="margin-top:20px;display:flex;flex-direction:column;align-items:center;gap:8px;">
            <div class="spinner"></div>
            <div style="font-size:0.8rem;color:var(--text-secondary);">Deriving Cryptographic Identity Keys...</div>
        </div>
    {/if}
</div>
