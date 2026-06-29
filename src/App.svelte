<script>
    import { state } from './lib/chat.svelte.js';
    import { login, addToast } from './lib/chat.svelte.js';
    import AuthScreen from './lib/AuthScreen.svelte';
    import ChatScreen from './lib/ChatScreen.svelte';
    import Toast from './lib/Toast.svelte';
</script>

{#if !state.isLoggedIn}
    <AuthScreen />
{:else}
    <ChatScreen />
{/if}

<Toast />
