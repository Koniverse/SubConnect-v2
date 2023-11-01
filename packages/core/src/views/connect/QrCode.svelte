<script lang="ts">
    import { QRCodeImage } from 'svelte-qrcode-image';
    import { fade } from 'svelte/transition'


    export let uriPolkadot: string;


    export let uriEth : string;

    console.log(uriEth, uriPolkadot)



    export let size : string;
    $: choiceTypeConnect  = true;


    function switchTypeConnect (){
        choiceTypeConnect = !choiceTypeConnect;
    }

    async function  onCopyUri  (){
        await navigator.clipboard.
        writeText(choiceTypeConnect ? uriEth : uriPolkadot)
    }

</script>

<style>
    .container {
        padding: var(--onboard-spacing-4, var(--spacing-4));
        font-size: var(--onboard-font-size-6, var(--font-size-6));
        line-height: 24px;
    }


    .flex{
        display: flex;
        flex-direction: column;

    }

    input {
        height: 1rem;
        width: 1rem;
        margin-right: 0.5rem;
    }
    .qrCode{
        margin: auto;
        opacity: 1;

    }
</style>

    <div class="container flex items-center qrCode">
        <label class="flex flex-column qrCode" transition:fade={{ duration: 300 }}>
            {#if (choiceTypeConnect === true)}
                <div on:click={switchTypeConnect}> Ethereum Connect</div>
                <QRCodeImage text = "{uriEth}" displayHeight={120} displayWidth={130}   />
                    {:else }
                <div on:click={switchTypeConnect}> Polkadot Connect</div>
                <QRCodeImage text = "{uriPolkadot}" displayHeight={120} displayWidth={130}/>
            {/if}
        </label>
        <button on:click={onCopyUri} >copy</button>
    </div>
