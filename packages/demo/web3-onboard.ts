
import injectedModule from '@subwallet_connect/injected-wallets'
import { init } from '@subwallet_connect/react'
import walletConnectModule from '@subwallet_connect/walletconnect'
import walletConnectPolkadotModule from '@subwallet_connect/walletconnect-polkadot'
import coinBaseModule from "@subwallet_connect/coinbase"
import cedeStoreWalletModule from '@subwallet_connect/cede-store'
import keepkeyModule from '@subwallet_connect/keepkey'
import ledgerModule from '@subwallet_connect/ledger'
import ledgerPolkadot from "@subwallet_connect/ledgerpolkadot";
import blocktoModule from  "@subwallet_connect/blocto"
import phantomModule from '@subwallet_connect/phantom'
import tallyHoModule from '@subwallet_connect/tallyho'
import metamaskSDK from '@subwallet_connect/metamask'
import infinityWalletModule from '@subwallet_connect/infinity-wallet'
import trustModule from '@subwallet_connect/trust'
import sequenceModule from '@subwallet_connect/sequence'
import {TransactionHandlerReturn} from "@subwallet_connect/core/dist/types";
import xdefiWalletModule from '@subwallet_connect/xdefi'
import fortmaticModule from '@subwallet_connect/fortmatic'
import Onboard from '@subwallet_connect/core'
import frameModule from '@subwallet_connect/frame'
import safeModule from '@subwallet_connect/gnosis'
import keystoneModule from '@subwallet_connect/keystone'
import portisModule from '@subwallet_connect/portis'
import torusModule from '@subwallet_connect/torus'
import trezorModule from '@subwallet_connect/trezor'
import coinbaseModule from '@subwallet_connect/coinbase'
import magicModule from '@subwallet_connect/magic'
import web3authModule from '@subwallet_connect/web3auth'
import gas from '@subwallet_connect/gas'
import dcentModule from '@subwallet_connect/dcent'
import zealModule from '@subwallet_connect/zeal'
import transactionPreviewModule from '@subwallet_connect/transaction-preview'
import enkryptModule from '@subwallet_connect/enkrypt'
import mewWalletModule from '@subwallet_connect/mew-wallet'
import uauthModule from '@subwallet_connect/uauth'
import frontierModule from '@subwallet_connect/frontier'
import bloctoModule from '@subwallet_connect/blocto'
import cedeStoreModule from '@subwallet_connect/cede-store'
import arcanaAuthModule from '@subwallet_connect/arcana-auth'
import venlyModule from '@subwallet_connect/venly'
import bitgetModule from '@subwallet_connect/bitget'


// Example key • Replace with your infura key
const INFURA_KEY = '302750fdd8644da3b50aa6daa0b89336'

const cedeStore = cedeStoreWalletModule();
const ledger = ledgerModule({ projectId : '16c6ad72b95e09bfdddfde13bf7f90b4',   walletConnectVersion: 2 })
const keepkey = keepkeyModule()
const ledgerPolkadot_ = ledgerPolkadot();
const coinBase = coinBaseModule()
const blocto = blocktoModule()
const xdefi = xdefiWalletModule()
const fortmatic = fortmaticModule({
  apiKey: 'pk_test_886ADCAB855632AA'
})

const injected = injectedModule({
  custom: [
    // include custom injected wallet modules here
  ],
  filter: {
    // mapping of wallet labels to filter here
  }
})
const phantom = phantomModule()
const walletConnect = walletConnectModule({
  projectId: 'd4a987cb0d1a746dbffd38890458e65c',
  dappUrl: 'https://www.onboard.blocknative.com'
})

const walletConnectPolkadot = walletConnectPolkadotModule({
  projectId: 'd4a987cb0d1a746dbffd38890458e65c',
})
const coinbaseWallet = coinbaseModule()
const metamaskSDKWallet = metamaskSDK({
  options: {
    extensionOnly: false,
    i18nOptions: {
      enabled: true
    },
    infuraAPIKey : INFURA_KEY,
    dappMetadata: {
      name: 'Demo Web3Onboard'
    }
  }
})
const trust = trustModule()
const tallyho = tallyHoModule()
const infinityWallet = infinityWalletModule()
const sequence = sequenceModule({
  appName: 'My app'
})
const portis = portisModule({
  apiKey: 'b2b7586f-2b1e-4c30-a7fb-c2d1533b153b'
})


const web3auth = web3authModule({
  clientId:
      'DJuUOKvmNnlzy6ruVgeWYWIMKLRyYtjYa9Y10VCeJzWZcygDlrYLyXsBQjpJ2hxlBO9dnl8t9GmAC2qOP5vnIGo'
})

const arcanaAuth = arcanaAuthModule({
  clientID: 'xar_test_c9c3bc702eb13255c58dab0e74cfa859711c13cb'
})

const torus = torusModule()
const keystone = keystoneModule()
const safe = safeModule()
const zeal = zealModule()
const frontier = frontierModule()

const trezorOptions = {
  email: 'test@test.com',
  appUrl: 'https://www.blocknative.com',
  consecutiveEmptyAccountThreshold: 10
  // containerElement: '#sample-container-el'
}
const trezor = trezorModule(trezorOptions)

const uauthOptions = {
  clientID: 'a25c3a65-a1f2-46cc-a515-a46fe7acb78c',
  walletConnectProjectId: 'f6bd6e2911b56f5ac3bc8b2d0e2d7ad5',
  redirectUri: 'http://localhost:8080/',
  scope:
      'openid wallet email:optional humanity_check:optional profile:optional social:optional'
}
const uauth = uauthModule(uauthOptions)

const magic = magicModule({
  apiKey: 'pk_live_02207D744E81C2BA'
  // userEmail: 'test@test.com'
  // userEmail is optional - if user has already logged in and/or session is still active a login modal will not appear
  // for more info see the @web3-onboard/magic docs
})

const dcent = dcentModule()
const bitget = bitgetModule()
const frameWallet = frameModule()
const enkrypt = enkryptModule()
const mewWallet = mewWalletModule()
const transactionPreview = transactionPreviewModule({
  requireTransactionApproval: true
})
const venly = venlyModule({
  clientId: 'blocknative',
  environment: 'staging'
})


export default init({
  theme: "dark",
  connect : {
    autoConnectLastWallet : true,
    autoConnectAllPreviousWallet : true
  },
  projectId : 'd4a987cb0d1a746dbffd38890458e65c',


  chainsPolkadot:[
    {
      // hex encoded string, eg '0x1' for Ethereum Mainnet
      id: '91b171bb158e2d3848fa23a9f1c25182',
      // string indicating chain namespace. Defaults to 'evm' but will allow other chain namespaces in the future
      namespace: 'substrate',
      // the native token symbol, eg ETH, BNB, MATIC
      token: 'DOT',
      // used for display, eg Polkadot
      label: 'Polkadot',
      // used for get balance
      rpcUrl: `polkadot.api.subscan.io`,
      decimal: 10
    },

    {
      id: 'afdc188f45c71dacbaa0b62e16a91f72' ,
      token: 'HDX',
      namespace: 'substrate',
      label: 'Hydradx',
      rpcUrl: 'hydradx.api.subscan.io',
      decimal : 12
    },
    {
      id: '9eb76c5184c4ab8679d2d5d819fdf90b',
      token: 'ASTR',
      label: 'Astar Network',
      decimal: 18,
      namespace: 'substrate',
      rpcUrl: 'astar.api.subscan.io'
    }

  ],

  // An array of wallet modules that you would like to be presented to the user to select from when connecting a wallet.
  wallets: [
    metamaskSDKWallet,
    injected,
    ledger,
    trezor,
    walletConnect,
    coinbaseWallet,
    phantom,
    safe,
    trust,
    tallyho,
    bitget,
    enkrypt,
    infinityWallet,
    mewWallet,
    keepkey,
    keystone,
    magic,
    fortmatic,
    portis,
    torus,
    dcent,
    sequence,
    uauth,
    web3auth,
    zeal,
    frontier,
    xdefi,
    frameWallet,
    cedeStore,
    arcanaAuth,
    blocto,
    venly
  ],
  // An array of Chains that your app supports
  chains: [
    {
      // hex encoded string, eg '0x1' for Ethereum Mainnet
      id: '0x1',
      // string indicating chain namespace. Defaults to 'evm' but will allow other chain namespaces in the future
      namespace: 'evm',
      // the native token symbol, eg ETH, BNB, MATIC
      token: 'ETH',
      // used for display, eg Ethereum Mainnet
      label: 'Ethereum Mainnet',
      // used for network requests
      rpcUrl: `https://mainnet.infura.io/v3/${INFURA_KEY}`
    },
    {
      id: 42161,
      token: 'ARB-ETH',
      label: 'Arbitrum One',
      rpcUrl: 'https://rpc.ankr.com/arbitrum'
    },
    {
      id: '0xa4ba',
      token: 'ARB',
      label: 'Arbitrum Nova',
      rpcUrl: 'https://nova.arbitrum.io/rpc'
    }

  ],
  appMetadata: {
    // The name of your dApp
    name: 'SubWallet Connect',

    description: 'Demo app for SubWalletConnect V2',
    // The url to a getting started guide for app
    gettingStartedGuide: 'http://mydapp.io/getting-started',
    // url that points to more information about app
    explore: 'http://mydapp.io/about',
    // if your app only supports injected wallets and when no injected wallets detected, recommend the user to install some
    recommendedInjectedWallets: [
      {
        // display name
        name: 'MetaMask',
        // link to download wallet
        url: 'https://metamask.io'
      },
      { name: 'Coinbase', url: 'https://wallet.coinbase.com/' }
    ],
    // Optional - but allows for dapps to require users to agree to TOS and privacy policy before connecting a wallet
    agreement: {
      version: '1.0.0',
      termsUrl: 'https://www.blocknative.com/terms-conditions',
      privacyUrl: 'https://www.blocknative.com/privacy-policy'
    }
  },
  notify: {
    desktop: {
      enabled: true,
      transactionHandler: (transaction) :TransactionHandlerReturn => {
        console.log({ transaction })
        if (transaction.eventCode === 'txConfirmed') {
          return {
            autoDismiss: 0
          }
        }
        // if (transaction.eventCode === 'txPool') {
        //   return {
        //     type: 'hint',
        //     message: 'Your in the pool, hope you brought a towel!',
        //     autoDismiss: 0,
        //     link: `https://goerli.etherscan.io/tx/${transaction.hash}`
        //   }
        // }
      },
      position: 'topLeft'
    }
  }
})
