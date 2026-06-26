<script>
    import { deriveSeed, generateKeyPair } from './crypto.js';
    import { connectServer } from './network.js';
    import { state as chat, login, addToast } from './chat.svelte.js';

    let email = $state('');
    let password = $state('');
    let serverUrl = $state('');
    let showPw = $state(false);

    $effect(() => {
        try {
            const saved = localStorage.getItem('cl_chat_server_url');
            serverUrl = saved || 'wss://cl-chat.786313.xyz/ws';
        } catch (e) {
            serverUrl = 'wss://cl-chat.786313.xyz/ws';
        }
    });

    function togglePw() {
        showPw = !showPw;
    }

    async function handleAccess() {
        const e = email.trim().toLowerCase();
        const p = password;
        const s = serverUrl.trim();

        if (!e || !p || !s) {
            addToast('Please fill in all fields.', 'error');
            return;
        }

        if (!window.crypto?.subtle) {
            addToast('HTTPS required for cryptography. Use the GitHub Pages URL.', 'error');
            return;
        }

        if (typeof nacl === 'undefined') {
            addToast('Crypto library not loaded. Try a hard refresh.', 'error');
            return;
        }

        try {
            localStorage.setItem('cl_chat_server_url', s);
        } catch (_) {}

        chat.authLoading = true;
        chat.authError = '';

        try {
            const derivedBytes = await deriveSeed(p, e);
            const keys = generateKeyPair(derivedBytes);
            login(e, keys.sign, keys.encrypt);
            connectServer(s);
        } catch (err) {
            const msg = err?.message || String(err) || 'Unknown error';
            chat.authError = msg;
            addToast('Failed: ' + msg, 'error');
            chat.authLoading = false;
            console.error('Auth error:', err);
        }
    }
</script>

<div class="auth-screen">
    <div class="auth-logo">CL-CHAT</div>
    <div class="auth-subtitle">Zero-Knowledge, End-to-End Encrypted.<br>Key pairs derived entirely client-side.</div>

    <div class="input-group">
        <label class="input-label" for="emailInput">Email</label>
        <input type="email" id="emailInput" class="input-field" placeholder="alice@example.com" autocomplete="email" bind:value={email}>
    </div>

    <div class="input-group">
        <label class="input-label" for="passwordInput">Security Password</label>
        <div style="position:relative;display:flex;align-items:center;">
            <input type={showPw ? 'text' : 'password'} id="passwordInput" class="input-field" placeholder="Strong password (zero-recovery)" autocomplete="new-password" bind:value={password} style="padding-right:44px;">
            <button onclick={togglePw} type="button" style="position:absolute;right:12px;background:none;border:none;cursor:pointer;font-size:1.2rem;color:var(--wa-text-muted);padding:4px;line-height:1;">
                {showPw ? '🙈' : '👁️'}
            </button>
        </div>
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
        <div style="margin-top:20px;display:flex;flex-direction:column;align-items:center;gap:12px;">
            <div class="spinner"></div>
            <div style="font-size:0.85rem;color:var(--wa-text-secondary);text-align:center;line-height:1.4;">
                Deriving Cryptographic Identity Keys...<br>
                <span style="font-size:0.75rem;color:var(--wa-text-muted);">PBKDF2 + NaCl key pair generation</span>
            </div>
        </div>
    {/if}
</div>
