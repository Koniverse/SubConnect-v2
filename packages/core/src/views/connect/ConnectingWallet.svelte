<script lang="ts">
  import { _ } from 'svelte-i18n'
  import type { WalletState, i18n } from '../../types.js'

  import WalletAppBadge from '../shared/WalletAppBadge.svelte'
  import en from '../../i18n/en.json'
  import { state } from '../../store/index.js'
  import { shareReplay, startWith, withLatestFrom } from 'rxjs'
  import { errorIcon } from '../../icons';
  import { qrModalConnect$, uriConnect$ } from '../../streams.js';
  import { MOBILE_WINDOW_WIDTH } from '../../constants.js';

  export let connectWallet: () => Promise<void>
  export let selectedWallet: WalletState
  export let deselectWallet: (label: string) => void
  export let setStep: (update: keyof i18n['connect']) => void
  export let connectionRejected: boolean
  export let previousConnectionRequest: boolean

  let windowWidth: number



  qrModalConnect$
  .pipe(withLatestFrom(uriConnect$))
  .subscribe(async ([{ isOpen, modal }, uri])=>{
    if(isOpen && modal && uri !== ''){
      try{
          await modal.openModal({ uri });
      } catch (e) {
        console.log(e)
      }
    } else {
      modal?.closeModal();
    }
  })


  const appMetadata$ = state
    .select('appMetadata')
    .pipe(startWith(state.get().appMetadata), shareReplay(1))
</script>

<style>
  .container {
    padding: 20px 24px 0 0;
  }

  .container.qr-container{
    padding: 0;
    margin-top: -3px;
  }

  .connecting-container {
    width: 100%;
    padding: var(--onboard-spacing-4, var(--spacing-4));
    padding: 12px 14px 16px 18px;
    transition: background-color 100ms ease-in-out,
      border-color 100ms ease-in-out;
    border-radius: var(--border-radius-5);
    background: var(--w3o-background-color-item, var(--primary-800));
    border: 1px solid transparent;
    color: var(--w3o-text-color, var(--white));
  }

  .connecting-container.qr-connecting-container{
    background-color: transparent;
  }

  .text {
    line-height: 24px;
    font-weight: 600;
  }

  .subtext {
    font-size: var(--onboard-font-size-7, var(--font-size-7));
    color: var(--gray-400);
    line-height: 20px;
    font-weight: 600;
  }

  .rejected-cta {
    color: var(--onboard-primary-500, var(--primary-2));
  }

  .onboard-button-primary {
    bottom: var(--onboard-spacing-3, var(--spacing-3));
  }

  .ml {
    margin-left: var(--onboard-spacing-4, var(--spacing-4));
  }


  @media all and (max-width: 520px) {
    .connecting-container {
      border-radius: var(--onboard-border-radius-4, var(--border-radius-4));
    }

    .container {
      padding-bottom: 0;
    }

    .wallet-badges {
      display: none;
    }

    .connecting-wallet-info {
      margin: 0;
    }

    .onboard-button-primary {
      display: none;
    }
  }

  .open-modal-footer{
    bottom: var(--onboard-spacing-3, var(--spacing-3));
    gap: 131px;
    align-items: center;
    margin-right: 30px;
  }

  .footer-text{
    width: 300px;
    height: 20px;
  }

</style>

<svelte:window bind:innerWidth={windowWidth} />

<div
    class="container flex flex-column items-center"
>
  <div
    class="connecting-container flex justify-between items-center"
  >
    <div class="flex">
      <div class="flex justify-center relative wallet-badges">
        <div class="relative">
          <WalletAppBadge
            size={40}
            padding={8}
            typeWallet={selectedWallet.type}
            background="transparent"
            icon={selectedWallet.icon}
          />
        </div>
      </div>

      <div class="flex flex-column justify-center ml connecting-wallet-info">
        <div class="text">
          {selectedWallet.label}
        </div>
        {#if connectionRejected}
          <div class="rejected-cta pointer subtext" on:click={connectWallet}>
            {$_('connect.connectingWallet.rejectedCTA', {
              default: en.connect.connectingWallet.rejectedCTA,
              values: { wallet: selectedWallet.label }
            })}
          </div>
        {:else}
          <div class="subtext">
            {$_(
              `connect.connectingWallet.${
                previousConnectionRequest ? 'previousConnection' : 'mainText'
              }`,
              {
                default: en.connect.connectingWallet.paragraph,
                values: { wallet: selectedWallet.label }
              }
            )}
          </div>
        {/if}
      </div>
    </div>
    {#if connectionRejected}
      <div class="tick flex items-center">
        {@html errorIcon}
      </div>
    {/if}
  </div>
      <button
          on:click={() => {
            deselectWallet(selectedWallet.label)
            setStep('selectingWallet')
    }}
              class="onboard-button-primary absolute"
      >{$_('connect.connectingWallet.primaryButton', {
        default: en.connect.connectingWallet.primaryButton
      })}</button
      >
</div>
