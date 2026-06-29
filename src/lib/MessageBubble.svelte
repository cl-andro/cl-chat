<script>
    import { state as chat } from './chat.svelte.js';
    import { sanitizeHTML, isLikelyCode } from './utils.js';

    let { message, index } = $props();

    let revealed = $state(false);
    let copied = $state(false);

    const isMe = $derived(message.sender === chat.myEmail);
    const isCode = $derived(!message.isSecret && isLikelyCode(message.text));
    const displayText = $derived(sanitizeHTML(message.text));

    function highlightText(text) {
        const q = chat.searchQuery;
        if (!q) return text;
        const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`(${escaped})`, 'gi');
        return text.replace(regex, '<span class="highlight-match">$1</span>');
    }

    function handleCopy() {
        navigator.clipboard.writeText(message.text).then(() => {
            copied = true;
            setTimeout(() => copied = false, 1500);
        });
    }

    function toggleReveal() {
        revealed = !revealed;
    }

    function bubbleClass() {
        let cls = 'message-bubble';
        if (isCode) cls += ' code-block';
        if (message.isSecret) cls += ' secret-block';
        if (revealed) cls += ' revealed';
        return cls;
    }

    function renderedContent() {
        if (message.isSecret && !revealed && isMe) {
            return '<span style="opacity:0.4;">•••••••• [click to reveal]</span>';
        }
        return highlightText(displayText);
    }
</script>

<div class="message-wrapper {isMe ? 'sent' : 'received'}" data-index={index}>
    <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
    <div class={bubbleClass()} onclick={message.isSecret && isMe ? toggleReveal : undefined}>
        {@html renderedContent()}
        <div class="message-meta">
            <span class="message-time">{message.time}</span>
            {#if isMe}
                <span class="message-status {message.status || 'sent'}">
                    {#if message.status === 'sending'}
                        🕒
                    {:else if message.status === 'delivered'}
                        ✓✓
                    {:else}
                        ✓
                    {/if}
                </span>
            {/if}
        </div>
    </div>
    <div class="message-actions">
        <button class="message-action-btn {copied ? 'copied' : ''}" onclick={handleCopy} title="Copy">
            {copied ? '✓' : '📋'}
        </button>
        {#if message.isSecret}
            <button class="message-action-btn" onclick={toggleReveal} title="Reveal/Hide">👁</button>
        {/if}
    </div>
</div>
