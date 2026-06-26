<script>
    import { state as chat, addMessage, clearActiveMessages, toggleSecretMode, addToast, setSearchQuery, selectContact } from './chat.svelte.js';
    import { encryptMessage, signPayload } from './crypto.js';
    import { wsSend, lookupContact } from './network.js';
    import { toHex, getTime, isSecretKey, debounce } from './utils.js';
    import MessageBubble from './MessageBubble.svelte';

    let chatInput = $state('');
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

    function goBack() {
        selectContact(null);
    }

    const activeMsgs = $derived(
        chat.activeContact ? (chat.contacts[chat.activeContact]?.messages ?? []) : []
    );

    const contactInitial = $derived(
        chat.activeContact ? chat.activeContact.charAt(0).toUpperCase() : ''
    );
</script>

<div class="chat-area-bg"></div>

<div class="chat-header">
    <div class="chat-header-left">
        <button class="back-btn" onclick={goBack}>←</button>
        <div class="chat-avatar">{contactInitial}</div>
        <div class="chat-contact-info">
            <div class="active-contact-title">{chat.activeContact}</div>
            <div class="chat-subtitle">🔒 End-to-end encrypted</div>
        </div>
    </div>
    <div class="chat-header-actions">
        <button class="chat-header-btn" onclick={clearChat} title="Clear chat">🗑</button>
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
    <input type="text" class="chat-input" placeholder="Type a message" bind:value={chatInput} onkeydown={handleKey}>
    <div class="chat-footer-actions">
        <button class="action-icon-btn {chat.secretMode ? 'active' : ''}" onclick={toggleSecretMode} title="Secret mode">🤫</button>
        <button class="send-btn" onclick={handleSend}>➔</button>
    </div>
</div>
