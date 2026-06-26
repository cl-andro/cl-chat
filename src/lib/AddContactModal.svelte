<script>
    import { state as chat, addContact, addToast } from './chat.svelte.js';
    import { lookupContact } from './network.js';

    let newEmail = $state('');

    function close() {
        state.showAddModal = false;
        newEmail = '';
    }

    function add() {
        const email = newEmail.trim().toLowerCase();
        if (!email) return;
        if (email === chat.myEmail) {
            addToast('You cannot add yourself.', 'error');
            return;
        }
        addContact(email);
        lookupContact(email);
        close();
    }
</script>

{#if chat.showAddModal}
    <!-- svelte-ignore a11y_interactive_supports_focus a11y_click_events_have_key_events a11y_no_static_element_interactions -->
    <div class="modal-overlay" style="display:flex;" onclick={close} role="dialog" tabindex="-1" onkeydown={(e) => e.key === 'Escape' && close()}>
        <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
        <div class="modal-card" onclick={(e) => e.stopPropagation()}>
            <h3>Add Contact</h3>
            <p>Enter the registered email of the person you want to chat with.</p>
            <input type="email" class="input-field" placeholder="contact@example.com" bind:value={newEmail}>
            <div class="modal-actions" style="margin-top:20px;">
                <button class="btn btn-secondary" onclick={close}>Cancel</button>
                <button class="btn" onclick={add}>Add Contact</button>
            </div>
        </div>
    </div>
{/if}
