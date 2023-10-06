<script lang="ts">
    import { _ } from 'svelte-i18n'
    import { Modal } from '../shared'
    import en from '../../i18n/en.json'
    import caretIcon from '../../icons/caret-light.js'
    import warningIcon from '../../icons/warning.js'
    import { state } from '../../store/index.js'
    import { listMethodTypeMessage } from '@web3-onboard/common';
    import { wallets$ } from '../../streams.js'
    let selectElement: HTMLSelectElement
    const wallets= $wallets$;
    const message = wallets[0].accounts[0].message;
    export let onConfirm: (value : string) => void
    export let onClose: () => void
</script>

<style>
    .content {
        padding: 1rem;
        width: 300px;
        font-family: var(--onboard-font-family-normal, var(--font-family-normal));
        font-size: var(--onboard-font-size-5, var(--font-size-5));
        line-height: 24px;
    }

    .icon-container {
        width: 3rem;
        height: 3rem;
        background: var(--onboard-warning-100, var(--warning-100));
        border-radius: 24px;
        padding: 12px;
        color: var(--onboard-warning-500, var(--warning-500));
    }

    h4 {
        margin: 1.5rem 0 0.5rem 0;
        font-weight: 600;
    }

    p {
        margin: 0;
        font-weight: 400;
    }

    button {
        margin-top: 1.5rem;
        width: 50%;
        font-weight: 600;
    }

    .right {
        margin-left: 0.5rem;
        width: 60%;
    }
</style>

<Modal close={onClose}>
    <div class="content">
        <div class="icon-container flex justify-center items-center">
            {@html warningIcon}
        </div>

        <h4>
            Sign Message
        </h4>
        {#if wallets[0].type === 'evm' }
        <p>
            Type Method Message
        </p>
        <select
                class={`flex justify-center items-center pointer maximized_ac`}
                bind:this={selectElement}
                value={listMethodTypeMessage[0]}
                style={`
    color: var(--account-center-maximized-network-selector-color,
    var(--account-center-network-selector-color, var(--gray-500)));
    background-image: url('data:image/svg+xml;utf8,${caretIcon}'); ${
    'font-weight: 0;'
  }`}
        >
            {#each listMethodTypeMessage as method}
                <option value={method}
                >{method}</option
                >
            {/each}
        </select>
            {:else if wallets[0].type === 'substrate' && wallets[0].signer}
            <p>
                Sign Dummy for wallet substrate
            </p>
        {/if}
        <div class="flex justify-between items-center w-100">
            <button class="button-neutral-solid-b rounded" on:click={onClose}
            >Cancel</button
            >
            <button class="right button-neutral-solid rounded" on:click={() => onConfirm( wallets[0].type === 'evm' ? selectElement.selectedOptions[0].value : 'signMessageForSubstrateWallet' )}
            >Sign</button
            >
        </div>
    </div>
</Modal>
