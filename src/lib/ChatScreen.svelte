<script>
    import { state } from './chat.svelte.js';
    import Sidebar from './Sidebar.svelte';
    import ChatArea from './ChatArea.svelte';
    import AddContactModal from './AddContactModal.svelte';
</script>

<div class="chat-screen">
    <!-- On mobile, hide the sidebar if there's an active contact -->
    <div class="sidebar {state.activeContact ? 'hidden' : ''}">
        <Sidebar />
    </div>
    
    <!-- On mobile, hide the chat area if there's no active contact -->
    <div class="chat-area {!state.activeContact ? 'hidden' : ''}">
        <ChatArea />
    </div>
</div>

<AddContactModal />
