import { fromEventPattern, Observable } from 'rxjs'
import { filter, takeUntil, take, share, switchMap } from 'rxjs/operators'
import partition from 'lodash.partition'
import { providers, utils } from 'ethers'
import {
  EthSignMessageRequest,
  PersonalSignMessageRequest,
  weiToEth,
  EIP712Request_v4,
  EIP712Request,
  SubstrateProvider
} from '@web3-onboard/common'
import { disconnectWallet$ } from './streams.js'
import { updateAccount, updateWallet } from './store/actions.js'
import { validEnsChain } from './utils.js'
import disconnect from './disconnect.js'
import { state } from './store/index.js'
import { getBNMulitChainSdk } from './services.js'
import { configuration } from './configuration.js'
import type {
  Injected,
  InjectedWindow
} from '@polkadot/extension-inject/types';


import type {
  ChainId,
  EIP1102Request,
  EIP1193Provider,
  ProviderAccounts,
  Chain,
  AccountsListener,
  ChainListener,
  SelectAccountsRequest
} from '@web3-onboard/common'

import type {
  Account,
  Address,
  Balances,
  Ens, WalletConnectState,
  WalletPermission,
  WalletState
} from './types.js'

import type { Uns } from '@web3-onboard/unstoppable-resolution'
import { updateSecondaryTokens } from './update-balances'

export const ethersProviders: {
  [key: string]: providers.StaticJsonRpcProvider
} = {}

export function getProvider(chain: Chain): providers.StaticJsonRpcProvider {
  if (!chain) return null

  if (!ethersProviders[chain.rpcUrl]) {
    ethersProviders[chain.rpcUrl] = new providers.StaticJsonRpcProvider(
        chain.providerConnectionInfo && chain.providerConnectionInfo.url
            ? chain.providerConnectionInfo
            : chain.rpcUrl
    )
  }

  return ethersProviders[chain.rpcUrl]
}

export async function requestAccounts(
    provider: EIP1193Provider
): Promise<WalletConnectState> {
  const args = { method: 'eth_requestAccounts' } as EIP1102Request
  const address = await provider.request(args)
  return ({ address })
}

export function selectAccounts(
    provider: EIP1193Provider
): Promise<ProviderAccounts> {
  const args = { method: 'eth_selectAccounts' } as SelectAccountsRequest
  return provider.request(args)
}

export function getChainId(provider: EIP1193Provider): Promise<string> {
  return provider.request({ method: 'eth_chainId' }) as Promise<string>
}




export function listenAccountsChanged(args: {
  provider: EIP1193Provider | SubstrateProvider
  disconnected$: Observable<string>,
  type : 'evm'|'substrate'
}): Observable<ProviderAccounts> {
  const { provider, disconnected$, type } = args

  const addHandler = (handler: AccountsListener) => {
    if( type === 'substrate') return ;
    (provider as EIP1193Provider).on('accountsChanged', handler)
  }

  const removeHandler = (handler: AccountsListener) => {
    if( type === 'substrate') return ;
    (provider as EIP1193Provider).removeListener('accountsChanged', handler)
  }

  return fromEventPattern<ProviderAccounts>(addHandler, removeHandler).pipe(
      takeUntil(disconnected$)
  )
}

export function listenChainChanged(args: {
  provider: EIP1193Provider | SubstrateProvider
  disconnected$: Observable<string>
  type : 'evm' | 'substrate'
}): Observable<ChainId> {
  const { provider, disconnected$, type } = args
  const addHandler = (handler: ChainListener) => {
    if( type === 'substrate') return;
    (provider as EIP1193Provider).on('chainChanged', handler)
  }

  const removeHandler = (handler: ChainListener) => {
    if( type === 'substrate') return;
    (provider as EIP1193Provider).removeListener('chainChanged', handler)
  }

  return fromEventPattern<ChainId>(addHandler, removeHandler).pipe(
      takeUntil(disconnected$)
  )
}

export function trackWallet(
    provider: EIP1193Provider | SubstrateProvider,
    label: WalletState['label'],
    type : 'evm' | 'substrate'
): void {``
  const disconnected$ = disconnectWallet$.pipe(
      filter(wallet => wallet === label),
      take(1)
  )


  const accountsChanged$ = listenAccountsChanged({
    type,
    provider,
    disconnected$
  }).pipe(share())

  // when account changed, set it to first account and subscribe to events
  accountsChanged$.subscribe(async ([address]) => {
    // sync accounts with internal state
    // in the case of an account has been manually disconnected
    try {
      await syncWalletConnectedAccounts(label)
    } catch (error) {
      console.warn(
          'Web3Onboard: Error whilst trying to sync connected accounts:',
          error
      )
    }

    // no address, then no account connected, so disconnect wallet
    // this could happen if user locks wallet,
    // or if disconnects app from wallet
    if (!address) {
      disconnect({ label })
      return
    }

    const { wallets } = state.get()
    const { accounts } = wallets.find(wallet => wallet.label === label)

    const [[existingAccount], restAccounts] = partition(
        accounts,
        account => account.address === address
    )

    // update accounts without ens/uns and balance first
    updateWallet(label, {
      accounts: [
        existingAccount || {
          address: address,
          ens: null,
          uns: null,
          balance: null
        },
        ...restAccounts
      ]
    })

    // if not existing account and notifications,
    // then subscribe to transaction events
    if (state.get().notify.enabled && !existingAccount) {
      const sdk = await getBNMulitChainSdk()

      if (sdk) {
        const wallet = state
            .get()
            .wallets.find(wallet => wallet.label === label)
        try {
          sdk.subscribe({
            id: address,
            chainId: wallet.chains[0].id,
            type: 'account'
          })
        } catch (error) {
          // unsupported network for transaction events
        }
      }
    }
  })

  // also when accounts change, update Balance and ENS/UNS
  accountsChanged$
      .pipe(
          switchMap(async ([address]) => {
            if (!address) return

            const { wallets, chains } = state.get()

            const primaryWallet = wallets.find(wallet => wallet.label === label)
            const { chains: walletChains, accounts } = primaryWallet

            const [connectedWalletChain] = walletChains

            const chain = chains.find(
                ({ namespace, id }) =>
                    namespace === 'evm' && id === connectedWalletChain.id
            )

            const balanceProm = getBalance(address, chain, 'substrate' )
            const secondaryTokenBal = updateSecondaryTokens(
                primaryWallet,
                address,
                chain
            )
            const account =
                accounts.find(account => account.address === address)

            const ensChain = chains.find(
                ({ id }) => id === validEnsChain(connectedWalletChain.id)
            )

            const ensProm =
                account && account.ens
                    ? Promise.resolve(account.ens)
                    : ensChain
                        ? getEns(address, ensChain)
                        : Promise.resolve(null)

            const unsProm =
                account && account.uns
                    ? Promise.resolve(account.uns)
                    : getUns(address, chain)

            return Promise.all([
              Promise.resolve(address),
              balanceProm,
              ensProm,
              unsProm,
              secondaryTokenBal
            ])
          })
      )
      .subscribe(res => {
        if (!res) return
        const [address, balance, ens, uns, secondaryTokens] = res
        updateAccount(label, address, { balance, ens, uns, secondaryTokens })
      })

  const chainChanged$ = listenChainChanged(
      { provider, disconnected$, type }).pipe(
      share()
  )

  // Update chain on wallet when chainId changed
  chainChanged$.subscribe(async chainId => {
    const { wallets } = state.get()
    const { chains, accounts } = wallets.find(wallet => wallet.label === label)
    const [connectedWalletChain] = chains

    if (chainId === connectedWalletChain.id) return

    if (state.get().notify.enabled) {
      const sdk = await getBNMulitChainSdk()

      if (sdk) {
        const wallet = state
            .get()
            .wallets.find(wallet => wallet.label === label)

        // Unsubscribe with timeout of 60 seconds
        // to allow for any currently inflight transactions
        wallet.accounts.forEach(({ address }) => {
          sdk.unsubscribe({
            id: address,
            chainId: wallet.chains[0].id,
            timeout: 60000
          })
        })

        // resubscribe for new chainId
        wallet.accounts.forEach(({ address }) => {
          try {
            sdk.subscribe({
              id: address,
              chainId: chainId,
              type: 'account'
            })
          } catch (error) {
            // unsupported network for transaction events
          }
        })
      }
    }

    const resetAccounts = accounts.map(
        ({ address }) =>
            ({
              address,
              ens: null,
              uns: null,
              balance: null
            } as Account)
    )

    updateWallet(label, {
      chains: [{ namespace: 'evm', id: chainId }],
      accounts: resetAccounts
    })
  })

  // when chain changes get ens/uns and balance for each account for wallet
  chainChanged$
      .pipe(
          switchMap(async chainId => {
            const { wallets, chains } = state.get()
            const primaryWallet = wallets.find(wallet => wallet.label === label)
            const { accounts } = primaryWallet

            const chain = chains.find(
                ({ namespace, id }) => namespace === 'evm' && id === chainId
            )

            return Promise.all(
                accounts.map(async ({ address }) => {
                  const balanceProm
                      = getBalance(address, chain, primaryWallet.type)

                  const secondaryTokenBal = updateSecondaryTokens(
                      primaryWallet,
                      address,
                      chain
                  )
                  const ensChain = chains.find(
                      ({ id }) => id === validEnsChain(chainId)
                  )

                  const ensProm = ensChain
                      ? getEns(address, ensChain)
                      : Promise.resolve(null)

                  const unsProm = validEnsChain(chainId)
                      ? getUns(address, ensChain)
                      : Promise.resolve(null)

                  const [balance, ens, uns, secondaryTokens]
                      = await Promise.all([
                    balanceProm,
                    ensProm,
                    unsProm,
                    secondaryTokenBal
                  ])

                  return {
                    address,
                    balance,
                    ens,
                    uns,
                    secondaryTokens
                  }
                })
            )
          })
      )
      .subscribe(updatedAccounts => {
        updatedAccounts && updateWallet(label, { accounts: updatedAccounts })
      })

  disconnected$.subscribe(() => {
    if( type  === 'substrate') return ;
    (provider as EIP1193Provider).disconnect
    && (provider as EIP1193Provider).disconnect()
  })
}

export async function getEns(
    address: Address,
    chain: Chain
): Promise<Ens | null> {
  // chain we don't recognize and don't have a rpcUrl for requests
  if (!chain) return null

  const provider = getProvider(chain)

  try {
    const name = await provider.lookupAddress(address)
    let ens = null

    if (name) {
      const resolver = await provider.getResolver(name)

      if (resolver) {
        const [contentHash, avatar] = await Promise.all([
          resolver.getContentHash(),
          resolver.getAvatar()
        ])

        const getText = resolver.getText.bind(resolver)

        ens = {
          name,
          avatar,
          contentHash,
          getText
        }
      }
    }

    return ens
  } catch (error) {
    console.error(error)
    return null
  }
}

export async function getUns(
    address: Address,
    chain: Chain
): Promise<Uns | null> {
  const { unstoppableResolution } = configuration

  // check if address is valid ETH address before attempting to resolve
  // chain we don't recognize and don't have a rpcUrl for requests
  if (!unstoppableResolution || !utils.isAddress(address) || !chain) return null

  try {
    return await unstoppableResolution(address)
  } catch (error) {
    console.error(error)
    return null
  }
}

export async function getBalance(
    address: string,
    chain: Chain,
    type : 'evm' | 'substrate'
): Promise<Balances | null> {
  // chain we don't recognize and don't have a rpcUrl for requests
  if (!chain) return null

  const { wallets } = state.get()

  try {
    const wallet = wallets.find(wallet => !!wallet.provider);
    const provider = wallet.provider

    const balanceHex = wallet.type === 'evm' ? await ( provider as  EIP1193Provider) .request({
      method: 'eth_getBalance',
      params: [address, 'latest']
    }) : '0x0'
    return balanceHex ? { [ wallet.type === 'evm' ? chain.token || 'ETH' : 'DOT']: weiToEth(balanceHex) } : null
  } catch (error) {
    console.error(error)
    return null
  }
}

export function switchChain(
    provider: EIP1193Provider ,
    chainId: ChainId
): Promise<unknown> {
  return provider.request({
    method: 'wallet_switchEthereumChain',
    params: [{ chainId }]
  })
}

export function addNewChain(
    provider: EIP1193Provider,
    chain: Chain
): Promise<unknown> {
  return provider.request({
    method: 'wallet_addEthereumChain',
    params: [
      {
        chainId: chain.id,
        chainName: chain.label,
        nativeCurrency: {
          name: chain.label,
          symbol: chain.token,
          decimals: 18
        },
        rpcUrls: [chain.publicRpcUrl || chain.rpcUrl],
        blockExplorerUrls: chain.blockExplorerUrl
            ? [chain.blockExplorerUrl]
            : undefined
      }
    ]
  })
}

export function updateChainRPC(
    provider: EIP1193Provider,
    chain: Chain,
    rpcUrl: string
): Promise<unknown> {
  return provider.request({
    method: 'wallet_addEthereumChain',
    params: [
      {
        chainId: chain.id,
        chainName: chain.label,
        nativeCurrency: {
          name: chain.label,
          symbol: chain.token,
          decimals: 18
        },
        rpcUrls: [rpcUrl],
        blockExplorerUrls: chain.blockExplorerUrl
            ? [chain.blockExplorerUrl]
            : undefined
      }
    ]
  })
}

export async function getPermissions(
    provider: EIP1193Provider
): Promise<WalletPermission[]> {
  try {

    const permissions = (await provider.request({
      method: 'wallet_getPermissions'
    })) as WalletPermission[]

    return Array.isArray(permissions) ? permissions : []
  } catch (error) {
    return []
  }
}

export async function signPersonalSignMessageRequest(
    provider : EIP1193Provider
) : Promise<string> {
  const { wallets } = state.get();
  return provider.request({
    method: 'personal_sign',
    params: ['hello, Im from subwallet connect', wallets[0].accounts[0].address]
  } as PersonalSignMessageRequest)
}

export async function signEthSignMessageRequest(
    provider : EIP1193Provider
) : Promise<string> {
  const { wallets } = state.get();

  return provider.request({
    method: 'eth_sign',
    params: [wallets[0].accounts[0].address, 'hello']
  } as EthSignMessageRequest)
}


export async function signTypedDataMessageRequest(
    provider : EIP1193Provider
) : Promise<string>{
  const { wallets, chains } = state.get();
  return provider.request({
    method: 'eth_signTypedData',
    params: [wallets[0].accounts[0].address,  {
      types: {
        EIP712Domain: [
          { name: 'name', type: 'string' },
          { name: 'version', type: 'string' },
          { name: 'chainId', type: 'uint256' },
          { name: 'verifyingContract', type: 'address' }
        ],
        Person: [
          { name: 'name', type: 'string' },
          { name: 'wallet', type: 'address' }
        ],
        Mail: [
          { name: 'from', type: 'Person' },
          { name: 'to', type: 'Person' },
          { name: 'contents', type: 'string' }
        ]
      },
      primaryType: 'Mail',
      domain: {
        name: 'Ether Mail',
        version: '1',
        chainId : chains[0].id,
        verifyingContract: '0xCcCCccccCCCCcCCCCCCcCcCccCcCCCcCcccccccC'
      },
      message: {
        from: {
          name: 'John Doe',
          wallet: wallets[0].accounts[0].address
        },
        to: {
          name: 'Alice',
          wallet: '0xbBbBBBBbbBBBbbbBbbBbbbbBBbBbbbbBbBbbBBbB'
        },
        contents: 'Hello'
      }
    }]
  } as EIP712Request)
}


export async function signTypedData_v4MessageRequest(
    provider : EIP1193Provider
) : Promise<string>{
  const { wallets, chains } = state.get();
  return provider.request({
    method: 'eth_signTypedData_v4',
    params: [wallets[0].accounts[0].address,  {
      domain: {
        chainId : chains[0].id,
        name: 'Ether Mail',
        verifyingContract: '0xCcCCccccCCCCcCCCCCCcCcCccCcCCCcCcccccccC',
        version: '1'
      },
      message: {
        contents: 'Hello',
        from: {
          name: 'Cow',
          wallets: [
            wallets[0].accounts[0].address,
            '0xDeaDbeefdEAdbeefdEadbEEFdeadbeEFdEaDbeeF'
          ]
        },
        to: [
          {
            name: 'Alice',
            wallets: [
              '0xbBbBBBBbbBBBbbbBbbBbbbbBBbBbbbbBbBbbBBbB',
              '0xB0BdaBea57B0BDABeA57b0bdABEA57b0BDabEa57',
              '0xB0B0b0b0b0b0B000000000000000000000000000'
            ]
          }
        ]
      },
      primaryType: 'Mail',
      types: {
        EIP712Domain: [
          { name: 'name', type: 'string' },
          { name: 'version', type: 'string' },
          { name: 'chainId', type: 'uint256' },
          { name: 'verifyingContract', type: 'address' }
        ],
        Group: [
          { name: 'name', type: 'string' },
          { name: 'members', type: 'Person[]' }
        ],
        Mail: [
          { name: 'from', type: 'Person' },
          { name: 'to', type: 'Person[]' },
          { name: 'contents', type: 'string' }
        ],
        Person: [
          { name: 'name', type: 'string' },
          { name: 'wallets', type: 'address[]' }
        ]
      }
    }]
  } as EIP712Request_v4)
}


export async function syncWalletConnectedAccounts(
    label: WalletState['label']
): Promise<void> {
  const wallet = state.get().wallets.find(wallet => wallet.label === label)
  const permissions = wallet.type === 'evm' ? await getPermissions((wallet.provider) as EIP1193Provider) : []
  const accountsPermissions = permissions.find(
      ({ parentCapability }) => parentCapability === 'eth_accounts'
  )

  if (accountsPermissions) {
    const { value: connectedAccounts } = accountsPermissions.caveats.find(
        ({ type }) => type === 'restrictReturnedAccounts'
    ) || { value: null }

    if (connectedAccounts) {
      const syncedAccounts = wallet.accounts.filter(({ address }) =>
          connectedAccounts.includes(address)
      )

      updateWallet(wallet.label, { ...wallet, accounts: syncedAccounts })
    }
  }
}

export const enable = async (
    provider : SubstrateProvider
)
    : Promise<WalletConnectState> => {

  try {
    const accounts = await provider.enable();

    return accounts
  }catch (e) {
    console.log('error', (e as Error).message);
  }
}
export const signDummy = async (wallet : WalletState) => {
  const signer = wallet?.signer;
  if (signer && signer.signRaw) {
    return  await signer.signRaw({ address : wallet.accounts[0].address, data: 'This is dummy message', type: 'bytes' } );
  }
}




