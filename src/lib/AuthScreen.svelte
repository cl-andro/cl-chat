<script>
    import { deriveSeed } from './crypto.js';
    import { connectServer } from './network.js';
    import { state as chat, addToast } from './chat.svelte.js';

    let email = $state('');
    let password = $state('');
    let serverUrl = $state('');
    let showPw = $state(false);
    
    // UI state to toggle between Login and Registration mode
    let isRegisterMode = $state(false);

    $effect(() => {
        try {
            const savedEmail = localStorage.getItem('cl_chat_email');
            if (savedEmail) email = savedEmail;
            
            const savedServer = localStorage.getItem('cl_chat_server_url');
            serverUrl = savedServer || 'wss://cl-chat.786313.xyz/ws';
        } catch (e) {
            serverUrl = 'wss://cl-chat.786313.xyz/ws';
        }
    });

    function togglePw() {
        showPw = !showPw;
    }

    function toggleMode(modeVal) {
        isRegisterMode = modeVal;
        chat.authError = '';
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
            const timeout = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Key derivation timed out (30s)')), 30000)
            );
            
            console.log('Starting PBKDF2 seed derivation...');
            const seed = await Promise.race([deriveSeed(p, e), timeout]);
            console.log('PBKDF2 complete, connecting to server...');
            
            // Connect to server in the chosen mode (login or register)
            const mode = isRegisterMode ? 'register' : 'login';
            connectServer(s, e, p, mode, seed);
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

    <!-- UI Tab Switcher -->
    <div class="auth-tabs" style="display:flex;width:100%;background:var(--wa-panel);border-radius:8px;padding:4px;margin-bottom:24px;border:1px solid var(--wa-border);">
        <button class="tab-btn" class:active={!isRegisterMode} onclick={() => toggleMode(false)} style="flex:1;padding:10px;border:none;border-radius:6px;background:{!isRegisterMode ? 'var(--wa-input-bg)' : 'transparent'};color:{!isRegisterMode ? '#fff' : 'var(--wa-text-secondary)'};font-weight:600;cursor:pointer;transition:all 0.2s;">
            Log In
        </button>
        <button class="tab-btn" class:active={isRegisterMode} onclick={() => toggleMode(true)} style="flex:1;padding:10px;border:none;border-radius:6px;background:{isRegisterMode ? 'var(--wa-input-bg)' : 'transparent'};color:{isRegisterMode ? '#fff' : 'var(--wa-text-secondary)'};font-weight:600;cursor:pointer;transition:all 0.2s;">
            Create Account
        </button>
    </div>

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

    {#if chat.authError}
        <div class="auth-error-msg" style="color:var(--wa-danger);font-size:0.85rem;margin-bottom:16px;text-align:left;width:100%;">
            ⚠️ {chat.authError}
        </div>
    {/if}

    {#if !chat.authLoading}
        <button class="btn" onclick={handleAccess}>
            <span>{isRegisterMode ? 'Create & Access Console' : 'Access Chat Console'}</span>
        </button>
        
        <div style="margin-top:16px;font-size:0.85rem;color:var(--wa-text-secondary);">
            {#if isRegisterMode}
                Already have an account? <span onclick={() => toggleMode(false)} style="color:var(--wa-green);cursor:pointer;font-weight:600;text-decoration:underline;">Log In</span>
            {:else}
                New to CL-CHAT? <span onclick={() => toggleMode(true)} style="color:var(--wa-green);cursor:pointer;font-weight:600;text-decoration:underline;">Create an Account</span>
            {/if}
        </div>
    {:else}
        <div style="margin-top:20px;display:flex;flex-direction:column;align-items:center;gap:12px;">
            <div class="spinner"></div>
            <div style="font-size:0.85rem;color:var(--wa-text-secondary);text-align:center;line-height:1.4;">
                Deriving Cryptographic Identity Keys... <br>
                <span style="font-size:0.75rem;color:var(--wa-text-muted);">
                    PBKDF2 + NaCl key pair generation
                </span>
            </div>
        </div>
    {/if}
</div>
