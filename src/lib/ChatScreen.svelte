<script>
    import { state } from './chat.svelte.js';
    import Sidebar from './Sidebar.svelte';
    import ChatArea from './ChatArea.svelte';
</script>

{#if state.activeContact}
    <div class="chat-area" class:sidebar>
        <ChatArea />
    </div>
{:else}
    <div class="sidebar" class:chat-area>
        <Sidebar />
    </div>
{/if}
