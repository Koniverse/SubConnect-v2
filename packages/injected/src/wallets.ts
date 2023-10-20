import type {
  EIP1193Provider,
  ChainListener,
  SimpleEventEmitter,
  ChainId,
  WalletInterfaceSubstrate, SubstrateProvider
} from '@web3-onboard/common'
import type {
  InjectedWindow
} from '@polkadot/extension-inject/types';
import {createEIP1193Provider, ProviderAccounts} from '@web3-onboard/common'
import {
  InjectedWalletModule,
  CustomWindow,
  BinanceProvider,
  ProviderExternalUrl
} from './types.js'
import type { Signer } from  '@polkadot/types/types';
import {
  InjectedNameSpace,
  ProviderIdentityFlag,
  ProviderLabel
} from './types.js'


declare const window: CustomWindow

const UNSUPPORTED_METHOD = null

const DAPP_NAME = 'SubWallet Connect_v2';
function getInjectedInterface(
    identity: string,
    checkOtherProviderFlags?: boolean
): () => Promise<{ provider: EIP1193Provider }> {
  return async () => ({
    provider: (window.ethereum.providers &&
    Array.isArray(window.ethereum.providers)
        ? getInterfaceFromProvidersArray(identity, checkOtherProviderFlags)
        : window.ethereum) as EIP1193Provider
  })
}

function getInterfaceFromProvidersArray(
    identity: string,
    checkOtherProviderFlags?: boolean
) {
  return window.ethereum.providers.find(provider => {
    return checkOtherProviderFlags
        ? !!provider[identity] && !otherProviderFlagsExist(identity, provider)
        : !!provider[identity]
  })
}

function otherProviderFlagsExist(identity: string, provider: any): boolean {
  const otherProviderFlags = Object.values(ProviderIdentityFlag).filter(
      id => id !== identity && id !== ProviderIdentityFlag.Detected
  )
  return otherProviderFlags.some(id => !!provider[id])
}

const metamask: InjectedWalletModule = {
  label: ProviderLabel.MetaMask,
  type : 'evm',
  injectedNamespace: InjectedNameSpace.Ethereum,
  checkProviderIdentity: ({ provider }) =>
      !!provider &&
      !!provider[ProviderIdentityFlag.MetaMask] &&
      !otherProviderFlagsExist(ProviderIdentityFlag.MetaMask, provider),
  getIcon: async () => (await import('./icons/metamask')).default,
  getInterface: getInjectedInterface(ProviderIdentityFlag.MetaMask, true),
  platforms: ['all'],
  externalUrl: ProviderExternalUrl.MetaMask
}

const infinitywallet: InjectedWalletModule = {
  label: ProviderLabel.InfinityWallet,
  type : 'evm',
  injectedNamespace: InjectedNameSpace.Ethereum,
  checkProviderIdentity: ({ provider }) =>
      !!provider && !!provider[ProviderIdentityFlag.InfinityWallet],
  getIcon: async () => (await import('./icons/infinitywallet')).default,
  getInterface: getInjectedInterface(ProviderIdentityFlag.InfinityWallet),
  platforms: ['desktop']
}

const exodus: InjectedWalletModule = {
  label: ProviderLabel.Exodus,
  type : 'evm',
  injectedNamespace: InjectedNameSpace.Ethereum,
  checkProviderIdentity: ({ provider }) =>
      !!provider && !!provider[ProviderIdentityFlag.Exodus],
  getIcon: async () => (await import('./icons/exodus')).default,
  getInterface: getInjectedInterface(ProviderIdentityFlag.Exodus),
  platforms: ['all']
}

const frontier: InjectedWalletModule = {
  label: ProviderLabel.Frontier,
  type: 'evm',
  injectedNamespace: InjectedNameSpace.Frontier,
  checkProviderIdentity: ({ provider }) =>
      !!provider &&
      !!provider['ethereum'] &&
      !!provider['ethereum'][ProviderIdentityFlag.Frontier],
  getIcon: async () => (await import('./icons/frontier')).default,
  getInterface: async () => ({
    provider: createEIP1193Provider(window.frontier.ethereum)
  }),
  platforms: ['all']
}

const brave: InjectedWalletModule = {
  label: ProviderLabel.Brave,
  type : 'evm',
  injectedNamespace: InjectedNameSpace.Ethereum,
  checkProviderIdentity: ({ provider }) =>
      !!provider && !!provider[ProviderIdentityFlag.BraveWallet],
  getIcon: async () => (await import('./icons/brave')).default,
  getInterface: getInjectedInterface(ProviderIdentityFlag.BraveWallet),
  platforms: ['all']
}

const binance: InjectedWalletModule = {
  label: ProviderLabel.Binance,
  type : 'evm',
  injectedNamespace: InjectedNameSpace.Binance,
  checkProviderIdentity: ({ provider }) =>
      !!provider && !!provider[ProviderIdentityFlag.Binance],
  getIcon: async () => (await import('./icons/binance')).default,
  getInterface: async () => {
    // Replace the provider as the BNB provider is readonly
    const tempBNBProvider: BinanceProvider = {
      ...window.BinanceChain
    }
    window.BinanceChain = tempBNBProvider

    const addListener: SimpleEventEmitter['on'] = window.BinanceChain.on.bind(
        window.BinanceChain
    )

    window.BinanceChain.on = (event, func) => {
      // intercept chainChanged event and format string
      if (event === 'chainChanged') {
        addListener(event, (chainId: ChainId) => {
          const cb = func as ChainListener
          cb(`0x${parseInt(chainId as string).toString(16)}`)
        })
      } else {
        addListener(event, func)
      }
    }

    const provider = createEIP1193Provider(window.BinanceChain, {
      eth_chainId: ({ baseRequest }) =>
          baseRequest({ method: 'eth_chainId' }).then(
              id => `0x${parseInt(id as string).toString(16)}`
          ),
      // Unsupported method -- will throw error
      eth_selectAccounts: UNSUPPORTED_METHOD,
      wallet_switchEthereumChain: UNSUPPORTED_METHOD
    })

    provider.removeListener = (event, func) => {}

    return {
      provider
    }
  },
  platforms: ['desktop'],
  externalUrl: ProviderExternalUrl.Binance
}

const coinbase: InjectedWalletModule = {
  label: ProviderLabel.Coinbase,
  type : 'evm',
  injectedNamespace: InjectedNameSpace.Ethereum,
  checkProviderIdentity: ({ provider }) =>
      (!!provider && !!provider[ProviderIdentityFlag.Coinbase]) ||
      (!!provider && !!provider[ProviderIdentityFlag.CoinbaseExtension]),
  getIcon: async () => (await import('./icons/coinbase')).default,
  getInterface: async () => {
    const { provider } = await getInjectedInterface(
        ProviderIdentityFlag.CoinbaseExtension
    )()

    const addListener: SimpleEventEmitter['on'] = provider.on.bind(provider)
    provider.on = (event, func) => {
      // intercept chainChanged event and format string
      if (event === 'chainChanged') {
        addListener(event, (chainId: string) => {
          const cb = func as ChainListener
          cb(`0x${parseInt(chainId).toString(16)}`)
        })
      } else {
        addListener(event, func)
      }
    }

    return { provider }
  },
  platforms: ['all'],
  externalUrl: ProviderExternalUrl.Coinbase
}

const detected: InjectedWalletModule = {
  label: ProviderLabel.Detected,
  type : 'evm',
  injectedNamespace: InjectedNameSpace.Ethereum,
  checkProviderIdentity: ({ provider }) =>
      !!provider && !!provider[ProviderIdentityFlag.Detected],
  getIcon: async () => (await import('./icons/detected')).default,
  getInterface: async () => ({
    provider: window.ethereum as EIP1193Provider
  }),
  platforms: ['all']
}

const trust: InjectedWalletModule = {
  label: ProviderLabel.Trust,
  injectedNamespace: InjectedNameSpace.Trust,
  type : 'evm',
  checkProviderIdentity: ({ provider }) =>
      !!provider && !!provider[ProviderIdentityFlag.Trust],
  getIcon: async () => (await import('./icons/trust')).default,
  getInterface: async () => {
    // eslint-disable-next-line no-prototype-builtins
    const ethereumInjectionExists = window.hasOwnProperty(
        InjectedNameSpace.Ethereum
    )

    let provider: EIP1193Provider

    // check if trust is injected into window.ethereum
    if (ethereumInjectionExists && window[InjectedNameSpace.Ethereum].isTrust) {
      provider = window[InjectedNameSpace.Ethereum]
    } else {
      // directly use the window.trustwallet injection
      provider = window[InjectedNameSpace.Trust]
    }

    return {
      provider
    }
  },
  platforms: ['all'],
  externalUrl: ProviderExternalUrl.Trust
}

const opera: InjectedWalletModule = {
  label: ProviderLabel.Opera,
  injectedNamespace: InjectedNameSpace.Ethereum,
  type : 'evm',
  checkProviderIdentity: ({ provider }) =>
      !!provider && !!provider[ProviderIdentityFlag.Opera],
  getIcon: async () => (await import('./icons/opera')).default,
  getInterface: async () => ({
    provider: createEIP1193Provider(window.ethereum, {
      eth_requestAccounts: async ({ baseRequest }) =>
          baseRequest({ method: 'eth_accounts' }),
      eth_selectAccounts: UNSUPPORTED_METHOD
    })
  }),
  platforms: ['all']
}

const status: InjectedWalletModule = {
  label: ProviderLabel.Status,
  type : 'evm',
  injectedNamespace: InjectedNameSpace.Ethereum,
  checkProviderIdentity: ({ provider }) =>
      !!provider && !!provider[ProviderIdentityFlag.Status],
  getIcon: async () => (await import('./icons/status')).default,
  getInterface: async () => {
    const provider = window.ethereum

    return {
      provider
    }
  },
  platforms: ['mobile']
}

const alphawallet: InjectedWalletModule = {
  label: ProviderLabel.AlphaWallet,
  type : 'evm',
  injectedNamespace: InjectedNameSpace.Ethereum,
  checkProviderIdentity: ({ provider }) =>
      !!provider && !!provider[ProviderIdentityFlag.AlphaWallet],
  getIcon: async () => (await import('./icons/alphawallet')).default,
  getInterface: async () => ({
    provider: createEIP1193Provider(window.ethereum, {
      wallet_switchEthereumChain: UNSUPPORTED_METHOD,
      eth_selectAccounts: UNSUPPORTED_METHOD
    })
  }),
  platforms: ['mobile']
}

const apexwallet: InjectedWalletModule = {
  label: ProviderLabel.ApexWallet,
  type : 'evm',
  injectedNamespace: InjectedNameSpace.Ethereum,
  checkProviderIdentity: ({ provider }) =>
      !!provider && !!provider[ProviderIdentityFlag.ApexWallet],
  getIcon: async () => (await import('./icons/apexwallet')).default,
  getInterface: async () => ({
    provider: window.ethereum
  }),
  platforms: ['desktop', 'Chrome', 'Chromium', 'Microsoft Edge']
}

const atoken: InjectedWalletModule = {
  label: ProviderLabel.AToken,
  type : 'evm',
  injectedNamespace: InjectedNameSpace.Ethereum,
  checkProviderIdentity: ({ provider }) =>
      !!provider && !!provider[ProviderIdentityFlag.AToken],
  getIcon: async () => (await import('./icons/atoken')).default,
  getInterface: async () => ({
    provider: window.ethereum
  }),
  platforms: ['mobile']
}

const bifrostwallet: InjectedWalletModule = {
  label: ProviderLabel.BifrostWallet,
  type : 'evm',
  injectedNamespace: InjectedNameSpace.Ethereum,
  checkProviderIdentity: ({ provider }) =>
      !!provider && !!provider[ProviderIdentityFlag.BifrostWallet],
  getIcon: async () => (await import('./icons/bifrostwallet')).default,
  getInterface: getInjectedInterface(ProviderIdentityFlag.BifrostWallet),
  platforms: ['all']
}

const bitpie: InjectedWalletModule = {
  label: ProviderLabel.Bitpie,
  type : 'evm',
  injectedNamespace: InjectedNameSpace.Ethereum,
  checkProviderIdentity: () => !!(window as any).Bitpie,
  getIcon: async () => (await import('./icons/bitpie')).default,
  getInterface: async () => ({
    provider: createEIP1193Provider(window.ethereum, {
      wallet_switchEthereumChain: UNSUPPORTED_METHOD,
      eth_selectAccounts: UNSUPPORTED_METHOD
    })
  }),
  platforms: ['mobile']
}

const blockwallet: InjectedWalletModule = {
  label: ProviderLabel.BlockWallet,
  type : 'evm',
  injectedNamespace: InjectedNameSpace.Ethereum,
  checkProviderIdentity: ({ provider }) =>
      !!provider && !!provider[ProviderIdentityFlag.BlockWallet],
  getIcon: async () => (await import('./icons/blockwallet')).default,
  getInterface: getInjectedInterface(ProviderIdentityFlag.BlockWallet),
  platforms: ['desktop']
}

const frame: InjectedWalletModule = {
  label: ProviderLabel.Frame,
  type : 'evm',
  injectedNamespace: InjectedNameSpace.Ethereum,
  checkProviderIdentity: ({ provider }) =>
      !!provider && !!provider[ProviderIdentityFlag.Frame],
  getIcon: async () => (await import('./icons/frame')).default,
  getInterface: async () => {
    const provider = window.ethereum
    if (!provider || !provider.connected) {
      throw new Error(
          'Frame App must be open with a hot wallet connected. If not installed first download the Frame App.'
      )
    }
    return { provider }
  },
  platforms: ['desktop']
}

const huobiwallet: InjectedWalletModule = {
  label: ProviderLabel.HuobiWallet,
  type : 'evm',
  injectedNamespace: InjectedNameSpace.Ethereum,
  checkProviderIdentity: ({ provider }) =>
      !!provider && !!provider[ProviderIdentityFlag.HuobiWallet],
  getIcon: async () => (await import('./icons/huobiwallet')).default,
  getInterface: async () => ({
    provider: createEIP1193Provider(window.ethereum, {
      wallet_switchEthereumChain: UNSUPPORTED_METHOD,
      eth_selectAccounts: UNSUPPORTED_METHOD
    })
  }),
  platforms: ['mobile']
}

const hyperpay: InjectedWalletModule = {
  label: ProviderLabel.HyperPay,
  type : 'evm',
  injectedNamespace: InjectedNameSpace.Ethereum,
  // Note: The property `hiWallet` is as of now the only known way of identifying hyperpay
  // wallet as it is a direct clone of metamask. `checkProviderIdentity` implementation is subject to
  // future changes
  checkProviderIdentity: () => !!(window as any).hiWallet,
  getIcon: async () => (await import('./icons/hyperpay')).default,
  getInterface: async () => ({
    provider: createEIP1193Provider(window.ethereum, {
      wallet_switchEthereumChain: UNSUPPORTED_METHOD,
      eth_selectAccounts: UNSUPPORTED_METHOD
    })
  }),
  platforms: ['mobile']
}

const imtoken: InjectedWalletModule = {
  label: ProviderLabel.ImToken,
  type : 'evm',
  injectedNamespace: InjectedNameSpace.Ethereum,
  checkProviderIdentity: ({ provider }) =>
      !!provider && !!provider[ProviderIdentityFlag.ImToken],
  getIcon: async () => (await import('./icons/imtoken')).default,
  getInterface: async () => ({
    provider: createEIP1193Provider(window.ethereum, {
      wallet_switchEthereumChain: UNSUPPORTED_METHOD,
      eth_selectAccounts: UNSUPPORTED_METHOD
    })
  }),
  platforms: ['mobile']
}

const liquality: InjectedWalletModule = {
  label: ProviderLabel.Liquality,
  type : 'evm',
  injectedNamespace: InjectedNameSpace.Ethereum,
  checkProviderIdentity: ({ provider }) =>
      !!provider && !!provider[ProviderIdentityFlag.Liquality],
  getIcon: async () => (await import('./icons/liquality')).default,
  getInterface: async () => {
    const provider = createEIP1193Provider(window.ethereum, {
      wallet_switchEthereumChain: UNSUPPORTED_METHOD,
      eth_selectAccounts: UNSUPPORTED_METHOD
    })

    provider.removeListener = (event, func) => {}

    return { provider }
  },
  platforms: ['desktop']
}

const meetone: InjectedWalletModule = {
  label: ProviderLabel.MeetOne,
  type : 'evm',
  injectedNamespace: InjectedNameSpace.Ethereum,
  checkProviderIdentity: ({ provider }) =>
      !!provider && provider[ProviderIdentityFlag.MeetOne] === 'MEETONE',
  getIcon: async () => (await import('./icons/meetone')).default,
  getInterface: async () => ({
    provider: window.ethereum
  }),
  platforms: ['mobile']
}

const mykey: InjectedWalletModule = {
  label: ProviderLabel.MyKey,
  type : 'evm',
  injectedNamespace: InjectedNameSpace.Ethereum,
  checkProviderIdentity: ({ provider }) =>
      !!provider && !!provider[ProviderIdentityFlag.MyKey],
  getIcon: async () => (await import('./icons/mykey')).default,
  getInterface: async () => ({
    provider: window.ethereum
  }),
  platforms: ['mobile']
}

const ownbit: InjectedWalletModule = {
  label: ProviderLabel.OwnBit,
  type : 'evm',
  injectedNamespace: InjectedNameSpace.Ethereum,
  checkProviderIdentity: ({ provider }) =>
      !!provider && !!provider[ProviderIdentityFlag.OwnBit],
  getIcon: async () => (await import('./icons/ownbit')).default,
  getInterface: async () => {
    const provider = createEIP1193Provider(window.ethereum, {
      eth_chainId: ({ baseRequest }) =>
          baseRequest({ method: 'eth_chainId' }).then(
              id => `0x${parseInt(id).toString(16)}`
          ),
      wallet_switchEthereumChain: UNSUPPORTED_METHOD,
      eth_selectAccounts: UNSUPPORTED_METHOD
    })
    provider.removeListener = (event, listener) => {}
    provider.on = (event, listener) => {}
    return { provider }
  },
  platforms: ['mobile']
}

const tokenpocket: InjectedWalletModule = {
  label: ProviderLabel.TokenPocket,
  type : 'evm',
  injectedNamespace: InjectedNameSpace.Ethereum,
  checkProviderIdentity: ({ provider }) =>
      !!provider &&
      !!provider[ProviderIdentityFlag.TokenPocket] &&
      !provider[ProviderIdentityFlag.TP],
  getIcon: async () => (await import('./icons/tokenpocket')).default,
  getInterface: getInjectedInterface(ProviderIdentityFlag.TokenPocket),
  platforms: ['all']
}

const tp: InjectedWalletModule = {
  label: ProviderLabel.TP,
  type : 'evm',
  injectedNamespace: InjectedNameSpace.Ethereum,
  checkProviderIdentity: ({ provider }) =>
      !!provider && !!provider[ProviderIdentityFlag.TP],
  getIcon: async () => (await import('./icons/tp')).default,
  getInterface: async () => ({
    provider: createEIP1193Provider(window.ethereum, {
      wallet_switchEthereumChain: UNSUPPORTED_METHOD,
      eth_selectAccounts: UNSUPPORTED_METHOD
    })
  }),
  platforms: ['mobile']
}

const xdefi: InjectedWalletModule = {
  label: ProviderLabel.XDEFI,
  type : 'evm',
  injectedNamespace: InjectedNameSpace.XFI,
  checkProviderIdentity: ({ provider }) =>
      provider &&
      provider.ethereum &&
      provider.ethereum[ProviderIdentityFlag.XDEFI],
  getIcon: async () => (await import('./icons/xdefi')).default,
  getInterface: async () => ({
    provider: (window as any).xfi && (window as any).xfi.ethereum
  }),
  platforms: ['all']
}

const oneInch: InjectedWalletModule = {
  label: ProviderLabel.OneInch,
  type : 'evm',
  injectedNamespace: InjectedNameSpace.Ethereum,
  checkProviderIdentity: ({ provider }) =>
      !!provider && !!provider[ProviderIdentityFlag.OneInch],
  getIcon: async () => (await import('./icons/oneInch')).default,
  getInterface: async () => ({
    provider: createEIP1193Provider(window.ethereum)
  }),
  platforms: ['mobile']
}

const tokenary: InjectedWalletModule = {
  label: ProviderLabel.Tokenary,
  type : 'evm',
  injectedNamespace: InjectedNameSpace.Ethereum,
  checkProviderIdentity: ({ provider }) =>
      !!provider && !!provider[ProviderIdentityFlag.Tokenary],
  getIcon: async () => (await import('./icons/tokenary')).default,
  getInterface: async () => ({
    provider: createEIP1193Provider(window.ethereum)
  }),
  platforms: ['all']
}

const tally: InjectedWalletModule = {
  label: ProviderLabel.Tally,
  type : 'evm',
  injectedNamespace: InjectedNameSpace.Tally,
  checkProviderIdentity: ({ provider }) =>
      !!provider && !!provider[ProviderIdentityFlag.Tally],
  getIcon: async () => (await import('./icons/tallywallet')).default,
  getInterface: async () => ({
    provider: createEIP1193Provider(window.tally)
  }),
  platforms: ['desktop']
}

const zeal: InjectedWalletModule = {
  label: ProviderLabel.Zeal,
  type : 'evm',
  injectedNamespace: InjectedNameSpace.Zeal,
  checkProviderIdentity: ({ provider }) =>
      !!provider && !!provider[ProviderIdentityFlag.Zeal],
  getIcon: async () => (await import('./icons/zeal')).default,
  getInterface: async () => ({
    provider: createEIP1193Provider(window.zeal)
  }),
  platforms: ['desktop']
}

const rabby: InjectedWalletModule = {
  label: ProviderLabel.Rabby,
  type : 'evm',
  injectedNamespace: InjectedNameSpace.Ethereum,
  checkProviderIdentity: ({ provider }) =>
      !!provider && !!provider[ProviderIdentityFlag.Rabby],
  getIcon: async () => (await import('./icons/rabby')).default,
  getInterface: async () => ({
    provider: createEIP1193Provider(window.ethereum)
  }),
  platforms: ['desktop']
}

const mathwallet: InjectedWalletModule = {
  label: ProviderLabel.MathWallet,
  type : 'evm',
  injectedNamespace: InjectedNameSpace.Ethereum,
  checkProviderIdentity: ({ provider }) =>
      !!provider && !!provider[ProviderIdentityFlag.MathWallet],
  getIcon: async () => (await import('./icons/mathwallet')).default,
  getInterface: getInjectedInterface(ProviderIdentityFlag.MathWallet),
  platforms: ['all']
}

const gamestop: InjectedWalletModule = {
  label: ProviderLabel.GameStop,
  type : 'evm',
  injectedNamespace: InjectedNameSpace.GameStop,
  checkProviderIdentity: ({ provider }) =>
      !!provider && !!provider[ProviderIdentityFlag.GameStop],
  getIcon: async () => (await import('./icons/gamestop')).default,
  getInterface: async () => {
    const provider = createEIP1193Provider(window.gamestop, {
      eth_chainId: ({ baseRequest }) =>
          baseRequest({ method: 'eth_chainId' }).then(
              id => `0x${parseInt(id).toString(16)}`
          ),
      wallet_switchEthereumChain: UNSUPPORTED_METHOD
    })
    provider.removeListener = (event, listener) => {}
    provider.on = (event, listener) => {}
    return { provider }
  },
  platforms: ['desktop']
}

const bitkeep: InjectedWalletModule = {
  label: ProviderLabel.BitKeep,
  type : 'evm',
  injectedNamespace: InjectedNameSpace.BitKeep,
  checkProviderIdentity: ({ provider }) =>
      !!provider && !!provider['ethereum'][ProviderIdentityFlag.BitKeep],
  getIcon: async () => (await import('./icons/bitkeep')).default,
  getInterface: async () => ({
    provider: window.bitkeep && window.bitkeep.ethereum
  }),
  platforms: ['all'],
  externalUrl: ProviderExternalUrl.BitKeep
}

const sequence: InjectedWalletModule = {
  label: ProviderLabel.Sequence,
  type : 'evm',
  injectedNamespace: InjectedNameSpace.Ethereum,
  checkProviderIdentity: ({ provider }) =>
      !!provider && !!provider[ProviderIdentityFlag.Sequence],
  getIcon: async () => (await import('./icons/sequence')).default,
  getInterface: async () => ({
    provider: window.ethereum
  }),
  platforms: ['all']
}

const core: InjectedWalletModule = {
  label: ProviderLabel.Core,
  type : 'evm',
  injectedNamespace: InjectedNameSpace.Avalanche,
  checkProviderIdentity: ({ provider }) =>
      !!provider && !!provider[ProviderIdentityFlag.Core],
  getIcon: async () => (await import('./icons/core')).default,
  getInterface: getInjectedInterface(ProviderIdentityFlag.Core),
  // Core wallet is only tested in chrome or chromium browser
  platforms: ['desktop', 'Chrome', 'Chromium', 'Microsoft Edge']
}

const bitski: InjectedWalletModule = {
  label: ProviderLabel.Bitski,
  type : 'evm',
  injectedNamespace: InjectedNameSpace.Bitski,
  checkProviderIdentity: ({ provider }) =>
      !!provider && !!provider.getProvider && !!provider.getProvider().isBitski,
  getIcon: async () => (await import('./icons/bitski')).default,
  getInterface: async () => ({
    provider:
        window.Bitski && window.Bitski.getProvider && window.Bitski.getProvider()
  }),
  platforms: ['all']
}

const zerion: InjectedWalletModule = {
  label: ProviderLabel.Zerion,
  type : 'evm',
  injectedNamespace: InjectedNameSpace.Ethereum,
  checkProviderIdentity: ({ provider }) =>
      !!provider && !!provider[ProviderIdentityFlag.Zerion],
  getIcon: async () => (await import('./icons/zerion')).default,
  getInterface: async () => ({
    provider: createEIP1193Provider(window.ethereum)
  }),
  platforms: ['all']
}

const enkrypt: InjectedWalletModule = {
  label: ProviderLabel.Enkrypt,
  type : 'evm',
  injectedNamespace: InjectedNameSpace.Enkrypt,
  checkProviderIdentity: ({ provider }) =>
      !!provider && !!provider.providers && !!provider.providers.ethereum,
  getIcon: async () => (await import('./icons/enkrypt')).default,
  getInterface: async () => {
    const addListener: SimpleEventEmitter['on'] =
        window.enkrypt.providers.ethereum.on.bind(
            window.enkrypt.providers.ethereum
        )

    window.enkrypt.providers.ethereum.on = (event, func) => {
      // intercept chainChanged event and format string
      if (event === 'chainChanged') {
        addListener(event, (chainId: ChainId) => {
          const cb = func as ChainListener
          cb(`0x${parseInt(chainId as string).toString(16)}`)
        })
      } else {
        addListener(event, func)
      }
    }

    const provider = createEIP1193Provider(window.enkrypt.providers.ethereum, {
      eth_chainId: ({ baseRequest }) =>
          baseRequest({ method: 'eth_chainId' }).then(
              id => `0x${parseInt(id as string).toString(16)}`
          )
    })

    provider.removeListener = (event, func) => {}

    return {
      provider
    }
  },
  platforms: ['all']
}

const phantom: InjectedWalletModule = {
  label: ProviderLabel.Phantom,
  type : 'evm',
  injectedNamespace: InjectedNameSpace.Phantom,
  checkProviderIdentity: ({ provider }) =>
      !!provider &&
      !!provider['ethereum'] &&
      !!provider['ethereum'][ProviderIdentityFlag.Phantom],
  getIcon: async () => (await import('./icons/phantom')).default,
  getInterface: async () => ({
    provider: createEIP1193Provider(window.phantom.ethereum)
  }),
  platforms: ['all'],
  externalUrl: ProviderExternalUrl.Phantom
}

const safepal: InjectedWalletModule = {
  label: ProviderLabel.SafePal,
  type : 'evm',
  injectedNamespace: InjectedNameSpace.Ethereum,
  checkProviderIdentity: ({ provider }) =>
      !!provider && !!provider[ProviderIdentityFlag.SafePal],
  getIcon: async () => (await import('./icons/safepal')).default,
  getInterface: async () => ({
    provider: createEIP1193Provider(window.ethereum)
  }),
  platforms: ['all']
}

const rainbow: InjectedWalletModule = {
  label: ProviderLabel.Rainbow,
  type : 'evm',
  injectedNamespace: InjectedNameSpace.Ethereum,
  checkProviderIdentity: ({ provider }) =>
      !!provider && !!provider[ProviderIdentityFlag.Rainbow],
  getIcon: async () => (await import('./icons/rainbow')).default,
  getInterface: getInjectedInterface(ProviderIdentityFlag.Rainbow),
  platforms: ['all']
}

const okxwallet: InjectedWalletModule = {
  label: ProviderLabel.OKXWallet,
  type : 'evm',
  injectedNamespace: InjectedNameSpace.OKXWallet,
  checkProviderIdentity: ({ provider }) =>
      !!provider && !!provider[ProviderIdentityFlag.OKXWallet],
  getIcon: async () => (await import('./icons/okxwallet')).default,
  getInterface: async () => ({
    provider: createEIP1193Provider(window.okxwallet)
  }),
  platforms: ['all'],
  externalUrl: ProviderExternalUrl.OKXWallet
}

const defiwallet: InjectedWalletModule = {
  label: ProviderLabel.DeFiWallet,
  type : 'evm',
  injectedNamespace: InjectedNameSpace.DeFiConnectProvider,
  checkProviderIdentity: ({ provider }) =>
      !!provider && !!provider[ProviderIdentityFlag.DeFiWallet],
  getIcon: async () => (await import('./icons/defiwallet')).default,
  getInterface: async () => ({
    provider: createEIP1193Provider(window.deficonnectProvider)
  }),
  platforms: ['all']
}

const safeheron: InjectedWalletModule = {
  label: ProviderLabel.Safeheron,
  type : 'evm',
  injectedNamespace: InjectedNameSpace.Safeheron,
  checkProviderIdentity: ({ provider }) =>
      !!provider && !!provider[ProviderIdentityFlag.Safeheron],
  getIcon: async () => (await import('./icons/safeheron')).default,
  getInterface: async () => ({
    provider: createEIP1193Provider(window.safeheron)
  }),
  platforms: ['desktop', 'Chrome', 'Chromium', 'Microsoft Edge']
}

const talisman: InjectedWalletModule = {
  label: ProviderLabel.Talisman,
  type : 'evm',
  injectedNamespace: InjectedNameSpace.Talisman,
  checkProviderIdentity: ({ provider }) =>
      !!provider && !!provider[ProviderIdentityFlag.Talisman],
  getIcon: async () => (await import('./icons/talisman')).default,
  getInterface: async () => ({
    provider: createEIP1193Provider(window.talismanEth)
  }),
  platforms: ['desktop'],
  externalUrl: ProviderExternalUrl.Talisman
}

const ronin: InjectedWalletModule = {
  label: ProviderLabel.RoninWallet,
  type : 'evm',
  injectedNamespace: InjectedNameSpace.RoninWallet,
  checkProviderIdentity: ({ provider }) => !!provider,
  getIcon: async () => (await import('./icons/roninwallet')).default,
  getInterface: async () => ({
    provider: createEIP1193Provider(window.ronin.provider)
  }),
  platforms: ['all'],
  externalUrl: ProviderExternalUrl.RoninWallet
}

const onekey: InjectedWalletModule = {
  label: ProviderLabel.OneKey,
  type : 'evm',
  injectedNamespace: InjectedNameSpace.OneKey,
  checkProviderIdentity: ({ provider }) =>
      !!provider &&
      !!provider.ethereum &&
      !!provider.ethereum[ProviderIdentityFlag.OneKey],
  getIcon: async () => (await import('./icons/onekey')).default,
  getInterface: async () => ({
    provider: createEIP1193Provider(window.$onekey.ethereum)
  }),
  platforms: ['all'],
  externalUrl: ProviderExternalUrl.OneKey
}

const fordefi: InjectedWalletModule = {
  label: ProviderLabel.Fordefi,
  type : 'evm',
  injectedNamespace: InjectedNameSpace.Ethereum,
  checkProviderIdentity: ({ provider }) =>
      !!provider &&
      !!provider[ProviderIdentityFlag.Fordefi],
  getIcon: async () => (await import('./icons/fordefi')).default,
  getInterface: getInjectedInterface(ProviderIdentityFlag.Fordefi, true),
  platforms: ['desktop']
}

const coin98wallet: InjectedWalletModule = {
  label: ProviderLabel.Coin98Wallet,
  type : 'evm',
  injectedNamespace: InjectedNameSpace.Ethereum,
  checkProviderIdentity: ({ provider }) =>
      !!provider && !!provider[ProviderIdentityFlag.Coin98Wallet],
  getIcon: async () => (await import('./icons/coin98wallet')).default,
  getInterface: async () => {
    // eslint-disable-next-line no-prototype-builtins
    const ethereumInjectionExists = window.hasOwnProperty(
        InjectedNameSpace.Ethereum
    )

    let provider: EIP1193Provider

    // check if coin98 is injected into window.ethereum
    if (
        ethereumInjectionExists &&
        window[InjectedNameSpace.Ethereum].isCoin98
    ) {
      provider = window[InjectedNameSpace.Ethereum]
    } else {
      // directly use the window.coin98 injection
      provider = window[InjectedNameSpace.Coin98Wallet].provider
    }

    return {
      provider
    }
  },
  platforms: ['all'],
  externalUrl: ProviderExternalUrl.Coin98Wallet
}

const subwallet: InjectedWalletModule = {
  label: ProviderLabel.SubWallet,
  type : 'evm',
  injectedNamespace: InjectedNameSpace.SubWallet,
  checkProviderIdentity: ({ provider }) =>
      !!provider && !!provider[ProviderIdentityFlag.SubWallet],
  getIcon: async () => (await import('./icons/subwallet')).default,
  getInterface: async () => ({
    provider: createEIP1193Provider(window.SubWallet)
  }),
  platforms: ['all'],
  externalUrl: ProviderExternalUrl.SubWallet
}

const kayros: InjectedWalletModule = {
  label: ProviderLabel.Kayros,
  type : 'evm',
  injectedNamespace: InjectedNameSpace.Kayros,
  checkProviderIdentity: ({ provider }) =>
      !!provider && !!provider[ProviderIdentityFlag.Kayros],
  getIcon: async () => (await import('./icons/kayros')).default,
  getInterface: async () => ({
    provider: createEIP1193Provider(window.kayros)
  }),
  platforms: ['desktop']
}
const subwalletDOT: InjectedWalletModule = {
  label: ProviderLabel.SubWalletDOT,
  type : 'substrate',
  injectedNamespace: InjectedNameSpace.SubWalletDOT,
  checkProviderIdentity: ({ provider }) =>
      provider?.injectedWeb3?.[ProviderIdentityFlag.SubWalletDOT],
  getIcon: async () => (await import('./icons/subwallet')).default,
  platforms: ['all'],
  getInterface: async () :Promise<WalletInterfaceSubstrate> => {
    const  isInstalled = (extensionName : string) =>{
      const injectedWindow = window as unknown as Window & InjectedWindow;
      const injectedExtension =
          injectedWindow?.injectedWeb3[extensionName]
      return !!injectedExtension;
    }
    const  getRawExtension = (extensionName : string)=>{
      const injectedWindow = window as unknown as Window & InjectedWindow;
      return injectedWindow?.injectedWeb3[extensionName];
    }
    const provider : SubstrateProvider = {
      async enable  ()   {
        const extensionName = InjectedNameSpace.SubWalletDOT;
        if (!isInstalled(extensionName)) {
          return ;
        }
        try {
          const injectedExtension = getRawExtension(extensionName);

          if (!injectedExtension || !injectedExtension.enable) {
            return;
          }

          const rawExtension = await injectedExtension.enable(DAPP_NAME);
          if (!rawExtension) {
            return;
          }
          const accounts = await rawExtension.accounts.get();

          return {
            signer : rawExtension.signer as Signer ,
            address : accounts.map(
                (account: { address: string })  => account.address
            )}
        }catch (e) {
          console.log('error', (e as Error).message);
        }
      },
      async signDummy( address : string, data : string ,
                       signer : Signer ) {
        if (signer && signer.signRaw) {
          return  await signer.signRaw({ address : address, data: 'This is dummy message', type: 'bytes' } );
        }
        return '0x0'
      }
    }

    return {
      provider
    }
  },
  externalUrl: ProviderExternalUrl.SubWallet,

}

const talismanDOT: InjectedWalletModule = {
  label: ProviderLabel.TalismanDOT,
  type : 'substrate',
  injectedNamespace: InjectedNameSpace.TalismanDOT,
  checkProviderIdentity: ({ provider }) =>
      provider?.injectedWeb3?.[ProviderIdentityFlag.TalismanDOT],
  getIcon: async () => (await import('./icons/talisman')).default,
  getInterface: async () :Promise<WalletInterfaceSubstrate> => {
     const  isInstalled = (extensionName : string) =>{
      const injectedWindow = window as unknown as Window & InjectedWindow;
      const injectedExtension =
          injectedWindow?.injectedWeb3[extensionName]
      return !!injectedExtension;
    }
     const  getRawExtension = (extensionName : string)=>{
      const injectedWindow = window as unknown as Window & InjectedWindow;
      return injectedWindow?.injectedWeb3[extensionName];
    }
    const provider : SubstrateProvider = {
      async enable  ()   {
        const extensionName = InjectedNameSpace.TalismanDOT;
        if (!isInstalled(extensionName)) {
          return ;
        }
        try {
          const injectedExtension = getRawExtension(extensionName);

          if (!injectedExtension || !injectedExtension.enable) {
            return;
          }

          const rawExtension = await injectedExtension.enable(DAPP_NAME);
          if (!rawExtension) {
            return;
          }
          const accounts = await rawExtension.accounts.get();

          return {
            signer : rawExtension.signer as Signer ,
            address : accounts.map(
                (account: { address: string })  => account.address
            )}
        }catch (e) {
          console.log('error', (e as Error).message);
        }
      },
      async signDummy( address : string, data : string ,
                       signer : Signer ) {
        if (signer && signer.signRaw) {
          return  await signer.signRaw({ address : address, data: 'This is dummy message', type: 'bytes' } );
        }
        return '0x0'
      }
    }

      return {
       provider
     }
  },
  platforms: ['all'],
  externalUrl: ProviderExternalUrl.Talisman
}

const wallets = [
  zeal,
  exodus,
  frontier,
  metamask,
  bifrostwallet,
  binance,
  coinbase,
  detected,
  trust,
  opera,
  status,
  alphawallet,
  apexwallet,
  atoken,
  bitpie,
  blockwallet,
  brave,
  frame,
  huobiwallet,
  hyperpay,
  imtoken,
  liquality,
  meetone,
  mykey,
  ownbit,
  tokenpocket,
  tp,
  xdefi,
  oneInch,
  tokenary,
  tally,
  rabby,
  mathwallet,
  gamestop,
  bitkeep,
  sequence,
  core,
  bitski,
  enkrypt,
  phantom,
  okxwallet,
  zerion,
  rainbow,
  safepal,
  defiwallet,
  infinitywallet,
  safeheron,
  talisman,
  onekey,
  fordefi,
  ronin,
  coin98wallet,
  subwallet,
  kayros,
  subwalletDOT,
  talismanDOT
]

export default wallets
