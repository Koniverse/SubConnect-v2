<script lang="ts">
  import type { EIP1193Provider, SubstrateProvider, WalletModule } from '@subwallet-connect/common'
  import { ProviderRpcErrorCode, ProviderRpcErrorMessage } from '@subwallet-connect/common';
  import EventEmitter from 'eventemitter3';
  import { BigNumber } from 'ethers'
  import { _ } from 'svelte-i18n'
  import en from '../../i18n/en.json'
  import {
    enable,
    getBalance,
    getChainId,
    getEns,
    getUns,
    listenAccountsChanged,
    listenStateModal,
    listenUriChange,
    requestAccounts,
    trackWallet
  } from '../../provider.js'
  import { state } from '../../store/index.js'
  import { connectWallet$, onDestroy$, qrModalConnect$, uriConnect$ } from '../../streams.js'
  import { addWallet, updateAccount } from '../../store/actions.js'
  import { getLocalStore, isSVG, setLocalStore, validEnsChain } from '../../utils.js'
  import CloseButton from '../shared/CloseButton.svelte'
  import Modal from '../shared/Modal.svelte'
  import Agreement from './Agreement.svelte'
  import ConnectedWallet from './ConnectedWallet.svelte'
  import ConnectingWallet from './ConnectingWallet.svelte'
  import InstallWalletNotifi from './InstallWalletNotifi.svelte'
  import SelectingWallet from './SelectingWallet.svelte'
  import Sidebar from './Sidebar.svelte'
  import { configuration } from '../../configuration.js'
  import { getBNMulitChainSdk } from '../../services.js'
  import { MOBILE_WINDOW_WIDTH, STORAGE_KEYS } from '../../constants.js'
  import { defaultSwIcon } from '../../icons/index.js'
  import {
    BehaviorSubject,
    distinctUntilChanged,
    filter,
    firstValueFrom,
    mapTo,
    shareReplay,
    startWith,
    Subject,
    take,
    takeUntil
  } from 'rxjs'

  import type { ConnectOptions, i18n, Uns, WalletConnectState, WalletState, WalletWithLoadingIcon } from '../../types.js'
  import { updateSecondaryTokens } from '../../update-balances'


  export let autoSelect: ConnectOptions['autoSelect']

  const appMetadata$ = state
    .select('appMetadata')
    .pipe(startWith(state.get().appMetadata), shareReplay(1))


  const { unstoppableResolution, device } = configuration

  const { walletModules, connect, chains } = state.get()
  const cancelPreviousConnect$ = new Subject<void>()

  let connectionRejected = false
  let previousConnectionRequest = false
  let wallets: WalletWithLoadingIcon[] = []
  let selectedWallet: WalletState | null
  let agreed: boolean
  let connectingWalletLabel: string
  let connectingWalletType: string
  let connectingErrorMessage: string

  let windowWidth: number
  let scrollContainer: HTMLElement

  $: uri = '';

  uriConnect$.subscribe((_uri)=>{
    if(_uri !== '' && windowWidth <= MOBILE_WINDOW_WIDTH){
      uri = _uri;
      openQrModal();
    }
  })

  qrModalConnect$.subscribe(({ isOpen, modal })=>{
    if(isOpen && modal && uri !== ''){
      modal.openModal({ uri })
    }else{
      modal?.closeModal();
    }
  })

  function openQrModal() {
    qrModalConnect$.next({
      ...qrModalConnect$.value,
      isOpen: true
    })
  }

  const modalStep$ = new BehaviorSubject<keyof i18n['connect']>(
    'selectingWallet'
  )

  $: availableWallets = wallets.length - state.get().wallets.length

  $: displayConnectingWallet =
    ($modalStep$ === 'connectingWallet' &&
      selectedWallet &&
      windowWidth >= MOBILE_WINDOW_WIDTH) ||
    (windowWidth <= MOBILE_WINDOW_WIDTH &&
      connectionRejected &&
      $modalStep$ === 'connectingWallet' &&
      selectedWallet)

  // handle the edge case where disableModals was set to true on first call
  // and then set to false on second call and there is still a pending call
  connectWallet$
    .pipe(
      distinctUntilChanged(
        (prev, curr) =>
          prev.autoSelect &&
          curr.autoSelect &&
          prev.autoSelect.disableModals === curr.autoSelect.disableModals
      ),
      filter(
        ({ autoSelect }) => autoSelect && autoSelect.disableModals === false
      ),
      takeUntil(onDestroy$)
    )
    .subscribe(() => {
      selectedWallet && connectWallet()
    })



  // ==== SELECT WALLET ==== //
  async function selectWallet({
    label,
    icon,
    getInterface,
    type
  }: WalletWithLoadingIcon): Promise<void> {
    connectingWalletLabel = label
    connectingWalletType = type
    try {
      const existingWallet = state
        .get()
        .wallets.find(wallet => wallet.label === label && wallet.type === type);

      if (existingWallet) {
        // set as first wallet
        addWallet(existingWallet)
        setTimeout(() => setStep('connectedWallet'), 1)

        selectedWallet = existingWallet

        return
      }


      const { chains } = state.get()

      const { provider, instance } = await getInterface({
        chains:  chains.filter((chain) => chain.namespace === type),
        BigNumber,
        EventEmitter,
        appMetadata: $appMetadata$
      })

      const loadedIcon = await icon




      selectedWallet = {
        label,
        icon: loadedIcon,
        type,
        provider,
        instance,
        accounts: [],
        chains: [{ namespace: type, id: (type === 'evm' ?
        '0x1' : '0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3') }]
      }

      connectingErrorMessage = ''
      scrollToTop()
      setStep('connectingWallet')
    } catch (error) {
      const { message } = error as { message: string }
      connectingErrorMessage = message
      connectingWalletLabel = ''
      connectingWalletType= 'evm'
      if(message.includes('not installed')){
        setStep('installWallet');
      }
      scrollToTop()
    }
  }


  function deselectWallet() {
    selectedWallet = null;
    qrModalConnect$.next({ ...qrModalConnect$.value, isOpen: false });
  }

  function updateSelectedWallet(update: Partial<WalletState> | WalletState) {
    selectedWallet = { ...selectedWallet, ...update }
  }

  async function autoSelectWallet(wallet: WalletModule): Promise<void> {
    const { getIcon, getInterface, label, type } = wallet
    const icon = getIcon()
    selectWallet({ label, icon, getInterface, type })
  }




  async function loadWalletsForSelection() {
    wallets = walletModules.map(({ getIcon, getInterface, label , type }) => {
      return {
        label,
        type,
        icon: getIcon(),
        getInterface
      }
    })
  }

  function close() {
    connectWallet$.next({ inProgress: false })
  }

  // ==== CONNECT WALLET ==== //
  async function connectWallet() {
    connectionRejected = false

    let { provider, label , type } = selectedWallet
    // change step on next event loop
    const removeUriListener =  listenUriChange(
            { provider, uriConnect$ }
    );
    const removeStateModalListener = listenStateModal(
            { provider, qrModalConnect$ }
    );

    if(qrModalConnect$.value.modal){
      qrModalConnect$.value.modal
        .subscribeModal(async ({ open }) => {
          if(!open
            && !(selectedWallet?.accounts
            && selectedWallet.accounts.length !== 0))
          {
            connectionRejected = true;
            removeStateModalListener();
            removeUriListener();
          }
        })
    }
    cancelPreviousConnect$.next()
    let chain: string | undefined = undefined;

    provider.on('chainChanged', (chainId) => {
      const chain_ = chains.find(({ id }) => id === chainId)
      if(chain_) {
        chain = chainId
      }
    })

    try {
      const valueResponse = await Promise.race([
        // resolved account
        type === 'evm' ? await requestAccounts(provider as EIP1193Provider) : await enable(provider as SubstrateProvider) ,
        // or connect wallet is called again whilst waiting for response
        firstValueFrom(cancelPreviousConnect$.pipe(mapTo<WalletConnectState>({
          address : undefined
        })))
      ]);
      if(!valueResponse ) return;

      const { address, signer, metadata } = valueResponse;

      // canceled previous request
      if (!address || address.length === 0) {
        connectionRejected = true;
        throw new Error(`Can't get account from your wallet`)
      }

      const addressFilter = address.filter((a) => {
        return type === 'evm' ? a.toLowerCase().startsWith('0x') : !a.toLowerCase().startsWith('0x')
      })


      if( addressFilter.length === 0 ){
        connectionRejected = true;
        throw new Error(`Can't get ${type} account from your wallet`)
      }
      // store last connected wallet
      if (
        state.get().connect.autoConnectLastWallet ||
        state.get().connect.autoConnectAllPreviousWallet
      ) {
        let labelsList: string | Array<string> = getLocalStore(
          STORAGE_KEYS.LAST_CONNECTED_WALLET
        )
        let labelsListParsed = JSON.parse(labelsList)
        try {
          if (labelsListParsed && Array.isArray(labelsListParsed)) {
            const tempLabels = labelsListParsed
            if(!tempLabels.some((wallet) => {
              return wallet.label === label && wallet.type === type
            }))
            labelsList = JSON.stringify(
                    [...new Set([{ label, type }, ...tempLabels])]
            )
          }
        } catch (err) {
          if (
            err instanceof SyntaxError &&
            labelsListParsed &&
            typeof labelsListParsed === 'string'
          ) {
            const tempLabel = labelsList
            labelsList = JSON.stringify([tempLabel])
          } else {
            throw new Error(err as string)
          }
        }

        if (!labelsList) labelsList = JSON.stringify([{ label, type }])
        setLocalStore(
          STORAGE_KEYS.LAST_CONNECTED_WALLET,
          labelsList
        )
      }

       chain = chain ? chain : selectedWallet.chains[0].id ;
      if( type === 'evm'){
        chain = await getChainId((provider as EIP1193Provider))

        if (state.get().notify.enabled) {
          const sdk = await getBNMulitChainSdk()

          if (sdk) {
            try {
              sdk.subscribe({
                id: addressFilter[0],
                chainId: chain,
                type: 'account'
              })
            } catch (error) {
              // unsupported network for transaction events
            }
          }
        }
      }

      const update: Pick<WalletState, 'accounts' | 'chains' | 'signer' | 'metadata'> = {
        accounts: addressFilter.map((address) => {
          let uns : Uns | null = null;
          let address_ = null;
          const inf = address.split('_');
          (inf.length === 2) && ( uns = { name: inf[1] });
          address_ = inf[0];

          return ({ address : address_, ens: null, uns, balance: null })
        }),
        chains: [{ namespace: type, id: chain }],
        signer : signer,
        metadata: metadata
      }

      addWallet({ ...selectedWallet, ...update })
      trackWallet( provider, label , type)
      updateSelectedWallet(update)
      setStep('connectedWallet')
      scrollToTop()
    } catch (error) {
      const { code, message } = error as { code: number; message: string }
      scrollToTop()
      console.log(error);
      qrModalConnect$.next({ ...qrModalConnect$.value, isOpen: false });

      // user rejected account access
      if (code === ProviderRpcErrorCode.ACCOUNT_ACCESS_REJECTED
              || message === ProviderRpcErrorMessage.ACCOUNT_ACCESS_REJECTED
      ) {
        connectionRejected = true;

        if (autoSelect.disableModals) {
          connectWallet$.next({ inProgress: false })
        } else if (autoSelect.label) {
          autoSelect.label = ''
        }

        return
      }

      // account access has already been requested and is awaiting approval
      if (code === ProviderRpcErrorCode.ACCOUNT_ACCESS_ALREADY_REQUESTED) {
        previousConnectionRequest = true

        if (autoSelect.disableModals) {
          connectWallet$.next({ inProgress: false })
          return
        }

        listenAccountsChanged({
          provider: selectedWallet.provider,
          disconnected$: connectWallet$.pipe(
            filter(({ inProgress }) => !inProgress),
            mapTo({ label : '', type: 'evm' }),
          ),
          type
        })
          .pipe(take(1))
          .subscribe(([account]) => {
            account && connectWallet()
          })

        return
      }
    }
  }

  // ==== CONNECTED WALLET ==== //
  async function updateAccountDetails() {
    const { accounts, chains: selectedWalletChains, type } = selectedWallet
    const appChains = state.get().chains
    const [connectedWalletChain] = selectedWalletChains

    const appChain = appChains.find(
      ({ namespace, id }) =>
        namespace === connectedWalletChain.namespace &&
        id === connectedWalletChain.id
    )
    if(!accounts && accounts.length === 0) return ;
    const { address } = accounts[0]
    let { balance, secondaryTokens } = accounts[0]

    if (balance === null) {
        await getBalance(address, appChain, type).then(balance => {
          updateAccount(selectedWallet.label, address, {
            balance
          })
        })
    }
    if (
      appChain &&
      !secondaryTokens &&
      Array.isArray(appChain.secondaryTokens) &&
      appChain.secondaryTokens.length
    ) {
      updateSecondaryTokens(selectedWallet, address, appChain).then(
        secondaryTokens => {
          updateAccount(selectedWallet.label, address, {
            secondaryTokens
          })
        }
      )
    }
    if(type === 'evm'){
      await Promise.all(
          accounts.map(({ ens, uns, address }) => {
            if (ens === null && validEnsChain(connectedWalletChain.id)) {
              const ensChain = chains.find(
                      ({ id }) =>
                              id === validEnsChain(connectedWalletChain.id)
              )

              getEns(address, ensChain).then(ens => {
                updateAccount(selectedWallet.label, address, {
                  ens
                })
              })
            }

            if (uns === null && unstoppableResolution) {
              getUns(address, appChain).then(uns => {
                updateAccount(selectedWallet.label, address, {
                  uns
                })
              })
            }
          })
      )
    }

    // if(selectedWallet.label === 'Ledger' && selectedWallet.type === 'substrate'){
    //   const isShowedModal = JSON.parse(
    //           getLocalStore(STORAGE_KEYS.CONNECT_HD_WALLET_MODAL)
    //   )
    //   if(!isShowedModal){
    //     return;
    //   }
    // }
    connectWallet$.next({ inProgress: false })
  }



  modalStep$.pipe(takeUntil(onDestroy$)).subscribe(async (step) => {
    switch (step) {
      case 'selectingWallet': {
        qrModalConnect$.next({
          ...qrModalConnect$.value,
          isOpen: false
        })
        if (autoSelect.label) {
          const walletToAutoSelect = walletModules.find(
            ({ label, type }) =>
              label.toLowerCase() === autoSelect.label.toLowerCase()
              && type === autoSelect.type
          )
          if (walletToAutoSelect) {
            autoSelectWallet(walletToAutoSelect)
          } else if (autoSelect.disableModals) {
            connectWallet$.next({ inProgress: false })
          }
        } else {
          connectingWalletLabel = ''
          connectingWalletType = 'evm'
          loadWalletsForSelection()
        }
        break
      }
      case 'connectingWallet': {
        connectWallet()
        break
      }
      case 'connectedWallet': {
        connectingWalletLabel = ''
        connectingWalletType = 'evm'
        updateAccountDetails()
        break
      }
    }
  })

  function setStep(update: keyof i18n['connect']) {
    cancelPreviousConnect$.next()
    modalStep$.next(update)
  }

  function scrollToTop() {
    scrollContainer && scrollContainer.scrollTo(0, 0)
  }

  const isSafariMobile =
    device.type === 'mobile' &&
    device.browser.name &&
    device.browser.name === 'Safari'
</script>

<style>
  .container {
    /* component values */
    --background-color: var(
      --onboard-main-scroll-container-background,
      var(--w3o-background-color)
    );
    --foreground-color: var(--w3o-foreground-color);
    --text-color: var(--onboard-connect-text-color, var(--w3o-text-color));
    --border-color: var(--w3o-border-color, var(--gray-200));
    --action-color: var(--w3o-action-color, var(--primary-500));
    --item-color: var(--w3o-background-color-item, var(--primary-500));

    /* themeable properties */
    font-family: var(--onboard-font-family-normal, var(--font-family-normal));
    font-size: var(--onboard-font-size-5, 1rem);
    background: var(--background-color);
    color: var(--text-color);
    border-color: var(--border-color);

    /* non-themeable properties */
    line-height: 24px;
    overflow: hidden;
    position: relative;
    display: flex;
    height: min-content;
    flex-flow: column-reverse;
  }

  .content {
    width: var(--onboard-connect-content-width, 100%);
    padding: 2rem 0 2rem 2rem;
  }

  .header {
    display: flex;
    padding-bottom: 14px;
    width: 502px;
    border-bottom: 3px solid transparent;
    background: var(--onboard-connect-header-background);
    color: var(--onboard-connect-header-color);
    border-color: var(--border-color);
  }

  .header-heading {
    line-height: 1rem;
    font-weight: 500;
  }

  .button-container {
    right: 1rem;
    top: 1rem;
  }

  .mobile-header {
    display: flex;
    gap: 0.5rem;
    height: 4.5rem; /* 72px */
    padding: 1rem;
    border-bottom: 1px solid;
    border-color: var(--border-color);
  }

  .mobile-subheader {
    opacity: 0.6;
    font-size: 0.875rem;
    font-weight: 400;
    line-height: 1rem;
    margin-top: 0.25rem;
  }

  .icon-container {
    display: flex;
    flex: 0 0 auto;
    height: 2.5rem;
    width: 2.5rem;
    min-width: 2.5rem;
    justify-content: center;
    align-items: center;
  }

  .disabled {
    opacity: 0.2;
    pointer-events: none;
    overflow: hidden;
  }

  :global(.icon-container svg) {
    display: block;
    height: 100%;
    width: auto;
  }

  .w-full {
    width: 100%;
  }

  .scroll-container {
    overflow-y: auto;
    transition: opacity 250ms ease-in-out;
    scrollbar-width: none; /* Firefox */
  }

  .scroll-container::-webkit-scrollbar {
    display: none; /* Chrome, Safari and Opera */
  }
  .mobile-safari {
    /* Handles for Mobile Safari's floating Address Bar
    covering the bottom of the connect modal **/
    padding-bottom: 80px;
  }

  @media all and (min-width: 768px) {
    .container {
      margin: 0;
      flex-flow: row;
      height: var(--onboard-connect-content-height, 440px);
    }
    .content {
      width: var(--onboard-connect-content-width, 570px);
    }
    .mobile-subheader {
      display: none;
    }
    .icon-container {
      display: none;
    }
  }

  @media  all and ( max-width: 768px) {
    .content {
      padding: 2rem 1rem 2rem 1rem;
    }
  }
</style>

<svelte:window bind:innerWidth={windowWidth} />

{#if !autoSelect.disableModals}
  <Modal close={!connect.disableClose && close}>
    <div class="container" class:mobile-safari={isSafariMobile} slot="content">
      {#if connect.showSidebar}
        <Sidebar step={$modalStep$} />
      {/if}

      <div class="content flex flex-column">
        {#if windowWidth <= MOBILE_WINDOW_WIDTH}
          <div class="mobile-header">
            <div class="icon-container">
              {#if $appMetadata$ && $appMetadata$.icon}
                {#if isSVG($appMetadata$.icon)}
                  {@html $appMetadata$.icon}
                {:else}
                  <img src={$appMetadata$.icon} alt="logo" />
                {/if}
              {:else}
                {@html defaultSwIcon}
              {/if}
            </div>
            <div class="flex flex-column justify-center w-full">
              <div class="header-heading">
                {$_(
                  $modalStep$ === 'connectingWallet' && selectedWallet
                    ? `connect.${$modalStep$}.header`
                    : `connect.${$modalStep$}.sidebar.subheading`,
                  {
                    default:
                      $modalStep$ === 'connectingWallet' && selectedWallet
                        ? en.connect[$modalStep$].header
                        : en.connect[$modalStep$].sidebar.subheading,
                    values: {
                      connectionRejected,
                      wallet: selectedWallet && selectedWallet.label
                    }
                  }
                )}
              </div>
              <div class="mobile-subheader">
                {$modalStep$ === 'selectingWallet'
                  ? `${availableWallets} available wallets`
                  : '1 account selected'}
              </div>
            </div>
          </div>
        {:else}
          <div class="header relative flex items-center">
            <div class="header-heading">
              {$_(`connect.${$modalStep$}.header`, {
                default: en.connect[$modalStep$].header,
                values: {
                  connectionRejected,
                  wallet: selectedWallet && selectedWallet.label
                }
              })}
              {$modalStep$ === 'selectingWallet' ? `(${availableWallets})` : ''}
            </div>
          </div>
        {/if}
        {#if !connect.disableClose}
          <!-- svelte-ignore a11y-click-events-have-key-events -->
          <div on:click={close} class="button-container absolute">
            <CloseButton />
          </div>
        {/if}
        <div class="scroll-container" bind:this={scrollContainer}>
          {#if $modalStep$ === 'selectingWallet' || windowWidth <= MOBILE_WINDOW_WIDTH}
            {#if wallets.length}
              <Agreement bind:agreed />

              <div class:disabled={!agreed}>
                <SelectingWallet
                  {selectWallet}
                  {wallets}
                  {connectingWalletType}
                  {connectingWalletLabel}
                  {connectingErrorMessage}
                />
              </div>
            {:else}
              <InstallWalletNotifi />
            {/if}
          {/if}

          {#if displayConnectingWallet}
            <ConnectingWallet
              {connectWallet}
              {connectionRejected}
              {previousConnectionRequest}
              {setStep}
              {deselectWallet}
              {selectedWallet}
            />
          {/if}

          {#if $modalStep$ === 'connectedWallet' && selectedWallet && windowWidth >= MOBILE_WINDOW_WIDTH}
            <ConnectedWallet {selectedWallet} />
          {/if}

        </div>
      </div>
    </div>
  </Modal>
{/if}
