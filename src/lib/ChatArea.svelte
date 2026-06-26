<script>
    import { state as chat, addMessage, clearActiveMessages, toggleSecretMode, addToast, setSearchQuery } from './chat.svelte.js';
    import { encryptMessage, signPayload } from './crypto.js';
    import { wsSend, lookupContact } from './network.js';
    import { toHex, getTime, isSecretKey, debounce } from './utils.js';
    import MessageBubble from './MessageBubble.svelte';

    let chatInput = $state('');
    let searchInput = $state('');
    let historyEl;

    $effect(() => {
        if (chat.activeContact && chat.contacts[chat.activeContact]) {
            chat.contacts[chat.activeContact].messages;
        }
    });

    $effect(() => {
        if (historyEl) {
            requestAnimationFrame(() => {
                historyEl.scrollTop = historyEl.scrollHeight;
            });
        }
    });

    const debouncedSearch = debounce((val) => {
        setSearchQuery(val);
    }, 300);

    function onSearchInput() {
        debouncedSearch(searchInput);
    }

    function handleSend() {
        const text = chatInput.trim();
        if (!text || !chat.activeContact) return;

        const contact = chat.contacts[chat.activeContact];
        if (!contact || !contact.publicKeys) {
            addToast('Public keys not available yet.', 'error');
            return;
        }

        try {
            const { ciphertext, nonce } = encryptMessage(
                text,
                contact.publicKeys.enc,
                chat.encryptKeyPair.secretKey
            );
            const signature = signPayload(ciphertext, chat.signKeyPair.secretKey);
            const isSecret = chat.secretMode || isSecretKey(text);

            wsSend({
                type: 'message',
                recipient: chat.activeContact,
                ciphertext: toHex(ciphertext),
                nonce: toHex(nonce),
                signature: toHex(signature),
                isSecret
            });

            addMessage(chat.activeContact, {
                sender: chat.myEmail,
                text,
                time: getTime(),
                isSecret
            });

            chatInput = '';
        } catch (e) {
            addToast('Failed to send: ' + e.message, 'error');
        }
    }

    function handleKey(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    }

    function clearChat() {
        if (chat.activeContact && chat.contacts[chat.activeContact]?.messages.length > 0) {
            clearActiveMessages();
            addToast('Chat history cleared', 'success');
        }
    }

    const activeMsgs = $derived(
        chat.activeContact ? (chat.contacts[chat.activeContact]?.messages ?? []) : []
    );
</script>

{#if chat.activeContact}
    <div id="activeChatView" style="display:flex;flex-direction:column;height:100%;width:100%;">
        <div class="chat-header">
            <div class="chat-header-left">
                <div class="active-contact-title">{chat.activeContact}</div>
                <button class="clear-chat-btn" onclick={clearChat} title="Clear chat history">🗑</button>
            </div>
            <div class="encryption-badge">
                <span>🔒 E2EE</span>
            </div>
        </div>

        <div class="search-bar">
            <div class="search-input-wrapper">
                <span class="search-icon">🔍</span>
                <input type="text" class="search-input" placeholder="Search messages..." bind:value={searchInput} oninput={onSearchInput}>
            </div>
        </div>

        <div id="messageHistory" class="message-history" bind:this={historyEl}>
            {#if activeMsgs.length === 0}
                <div class="empty-state">No messages yet. Send your first secure message.</div>
            {:else}
                {#each activeMsgs as msg, i (i)}
                      <MessageBubble message={msg} index={i} />
                {/each}
            {/if}
        </div>

        <div class="chat-footer">
            <input type="text" class="chat-input" placeholder="Type a secure message..." bind:value={chatInput} onkeydown={handleKey}>
            <div class="chat-footer-actions">
                <button id="secretToggle" class="action-icon-btn {chat.secretMode ? 'active' : ''}" onclick={toggleSecretMode} title="Toggle secret mode">🤫</button>
                <button class="send-btn" onclick={handleSend}>➔</button>
            </div>
        </div>
    </div>
{:else}
    <div id="noChatSelected" class="no-active-chat">
        <div class="no-active-chat-icon">💬</div>
        <div style="font-weight:700;margin-bottom:4px;">Select a Conversation</div>
        <div style="font-size:0.85rem;">Choose a contact or add one to start secure messaging.</div>
    </div>
{/if}
