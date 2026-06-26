<script>
    import { state, selectContact } from './chat.svelte.js';
    import { truncate, sanitizeHTML } from './utils.js';

    function contactEmailList() {
        return Object.keys(state.contacts);
    }

    function lastMsg(email) {
        const msgs = state.contacts[email]?.messages;
        return msgs?.length ? msgs[msgs.length - 1] : null;
    }

    function hasKeys(email) {
        return !!state.contacts[email]?.publicKeys;
    }
</script>

<div class="sidebar">
    <div class="sidebar-header">
        <div class="sidebar-title">CL-CHAT</div>
        <div class="user-badge">{state.myEmail}</div>
        <div class="connection-status">
            <div class="status-dot {state.connectionStatus === 'connected' ? 'connected' : state.connectionStatus === 'connecting' ? 'connecting' : ''}"></div>
            <span id="statusText">
                {state.connectionStatus === 'connected' ? 'Connected' : state.connectionStatus === 'connecting' ? 'Connecting...' : 'Disconnected'}
            </span>
        </div>
    </div>

    <div class="contact-section">
        <div class="contact-header">
            <span class="section-label">Conversations</span>
            <button class="add-contact-btn" onclick={() => state.showAddModal = true}>+ Add User</button>
        </div>

        {#if contactEmailList().length === 0}
            <div class="empty-state">No conversations yet.<br>Click <strong>+ Add User</strong> to start.</div>
        {:else}
            <ul class="contact-list">
                {#each contactEmailList() as email (email)}
                    <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_noninteractive_element_interactions a11y_no_noninteractive_tabindex -->
                    <li class="contact-item {state.activeContact === email ? 'active' : ''}" onclick={() => selectContact(email)} onkeydown={(e) => e.key === 'Enter' && selectContact(email)} tabindex="0">
                        <div class="contact-avatar">{email.charAt(0).toUpperCase()}</div>
                        <div class="contact-details">
                            <div class="contact-name">{email}</div>
                            {#if lastMsg(email)}
                                <div style="font-size:0.75rem;color:var(--text-muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">
                                    {truncate(sanitizeHTML(lastMsg(email).text), 30)}
                                </div>
                            {/if}
                        </div>
                        {#if hasKeys(email)}
                            <span style="font-size:0.6rem;color:var(--success);">🔐</span>
                        {:else}
                            <span style="font-size:0.6rem;color:var(--warning);">⏳</span>
                        {/if}
                    </li>
                {/each}
            </ul>
        {/if}
    </div>
</div>
