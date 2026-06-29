<script>
    import { state as chat, selectContact } from './chat.svelte.js';
    import { truncate, sanitizeHTML, debounce } from './utils.js';

    let searchVal = $state('');

    const debouncedSearch = debounce((val) => {
        chat.searchQuery = val;
    }, 300);

    function onSearch() {
        debouncedSearch(searchVal);
    }

    function contactEmailList() {
        return Object.keys(chat.contacts);
    }

    function lastMsg(email) {
        const msgs = chat.contacts[email]?.messages;
        return msgs?.length ? msgs[msgs.length - 1] : null;
    }

    function hasKeys(email) {
        return !!chat.contacts[email]?.publicKeys;
    }

    function handleLogout() {
        try {
            localStorage.removeItem('cl_chat_email');
            localStorage.removeItem('cl_chat_password');
        } catch (_) {}
        window.location.reload();
    }
</script>

<div class="sidebar-header">
    <div class="sidebar-header-left">
        <div class="sidebar-avatar">{chat.myEmail.charAt(0).toUpperCase()}</div>
        <div class="sidebar-user-info">
            <div class="sidebar-title">CL-CHAT</div>
            <div class="connection-status">
                <div class="status-dot {chat.connectionStatus === 'connected' ? 'connected' : chat.connectionStatus === 'connecting' ? 'connecting' : ''}"></div>
                <span>
                    {chat.connectionStatus === 'connected' ? 'Online' : chat.connectionStatus === 'connecting' ? 'Connecting...' : 'Offline'}
                </span>
            </div>
        </div>
    </div>
    <div class="sidebar-actions" style="display:flex;align-items:center;gap:8px;">
        <button class="sidebar-action-btn" onclick={() => chat.showAddModal = true} title="Add contact">+</button>
        <button class="sidebar-action-btn" onclick={handleLogout} title="Log Out" style="font-size:1.1rem;">🚪</button>
    </div>
</div>

<div class="contact-search">
    <input type="text" class="contact-search-input" placeholder="Search or start new chat" bind:value={searchVal} oninput={onSearch}>
</div>

<div class="contact-section">
    {#if contactEmailList().length === 0}
        <div class="empty-state">No conversations yet.<br>Tap <strong>+</strong> to add a contact.</div>
    {:else}
        <ul class="contact-list">
            {#each contactEmailList() as email (email)}
                <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_noninteractive_element_interactions a11y_no_noninteractive_tabindex -->
                <li class="contact-item {chat.activeContact === email ? 'active' : ''}" onclick={() => selectContact(email)} onkeydown={(e) => e.key === 'Enter' && selectContact(email)} tabindex="0">
                    <div class="contact-avatar">{email.charAt(0).toUpperCase()}</div>
                    <div class="contact-details">
                        <div class="contact-name">{email}</div>
                        {#if lastMsg(email)}
                            <div class="contact-preview">{truncate(sanitizeHTML(lastMsg(email).text), 30)}</div>
                        {/if}
                    </div>
                    <div class="contact-meta">
                        {#if lastMsg(email)}
                            <div class="contact-time">{lastMsg(email).time}</div>
                        {/if}
                        <div class="contact-key-status">
                            {#if hasKeys(email)}
                                <span style="color:var(--wa-green);">🔐</span>
                            {:else}
                                <span style="color:var(--wa-warning);">⏳</span>
                            {/if}
                        </div>
                    </div>
                </li>
            {/each}
        </ul>
    {/if}
</div>
