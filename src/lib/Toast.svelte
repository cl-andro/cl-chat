<script>
    import { state } from './chat.svelte.js';
</script>

{#if state.toasts.length > 0}
    <div class="toast-container">
        {#each state.toasts as toast (toast.id)}
            <div class="toast {toast.type}">{toast.message}</div>
        {/each}
    </div>
{/if}
