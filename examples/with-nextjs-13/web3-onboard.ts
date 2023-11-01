
import injectedModule from '@web3-onboard/injected-wallets'
import { init } from '@web3-onboard/react'
import walletConnectModule from '@web3-onboard/walletconnect'

import cedeStoreWalletModule from '@web3-onboard/cede-store'
import keepkeyModule from '@web3-onboard/keepkey'
import keystoneModule from '@web3-onboard/keystone'
import ledgerModule from '@web3-onboard/ledger'
import ledgerPolkadot from "@web3-onboard/ledgerpolkadot";


// Example key • Replace with your infura key
const INFURA_KEY = '2996ff3d1a1142689324a8341cb75c68'

const cedeStore = cedeStoreWalletModule();
const ledger = ledgerModule({ projectId : '16c6ad72b95e09bfdddfde13bf7f90b4',   walletConnectVersion: 2 })
const keepkey = keepkeyModule()
const keystone = keystoneModule()
const ledgerPolkadot_ = ledgerPolkadot();
const injected = injectedModule({
  custom: [
    // include custom injected wallet modules here
  ],
  filter: {
    // mapping of wallet labels to filter here
  }
})
const walletConnect = walletConnectModule({
  projectId : '16c6ad72b95e09bfdddfde13bf7f90b4',
  version: 2,
})

export default init({
  connect : {
    autoConnectLastWallet : true,
    autoConnectAllPreviousWallet : true
  },
  projectId : '16c6ad72b95e09bfdddfde13bf7f90b4',

  url : 'http://localhost:3000/',

  chainsPolkadot:['polkadot'],

  // An array of wallet modules that you would like to be presented to the user to select from when connecting a wallet.
  wallets: [
    injected,
    walletConnect,
    cedeStore,
    ledger,
    keepkey,
    keystone,
    ledgerPolkadot_
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
    // SVG icon string, with height or width (whichever is larger) set to 100% or a valid image URL
    icon: '<svg width="283" height="64" viewBox="0 0 283 64" fill="none" \n' +
        '    xmlns="http://www.w3.org/2000/svg">\n' +
        '    <path d="M141.04 16c-11.04 0-19 7.2-19 18s8.96 18 20 18c6.67 0 12.55-2.64 16.19-7.09l-7.65-4.42c-2.02 2.21-5.09 3.5-8.54 3.5-4.79 0-8.86-2.5-10.37-6.5h28.02c.22-1.12.35-2.28.35-3.5 0-10.79-7.96-17.99-19-17.99zm-9.46 14.5c1.25-3.99 4.67-6.5 9.45-6.5 4.79 0 8.21 2.51 9.45 6.5h-18.9zM248.72 16c-11.04 0-19 7.2-19 18s8.96 18 20 18c6.67 0 12.55-2.64 16.19-7.09l-7.65-4.42c-2.02 2.21-5.09 3.5-8.54 3.5-4.79 0-8.86-2.5-10.37-6.5h28.02c.22-1.12.35-2.28.35-3.5 0-10.79-7.96-17.99-19-17.99zm-9.45 14.5c1.25-3.99 4.67-6.5 9.45-6.5 4.79 0 8.21 2.51 9.45 6.5h-18.9zM200.24 34c0 6 3.92 10 10 10 4.12 0 7.21-1.87 8.8-4.92l7.68 4.43c-3.18 5.3-9.14 8.49-16.48 8.49-11.05 0-19-7.2-19-18s7.96-18 19-18c7.34 0 13.29 3.19 16.48 8.49l-7.68 4.43c-1.59-3.05-4.68-4.92-8.8-4.92-6.07 0-10 4-10 10zm82.48-29v46h-9V5h9zM36.95 0L73.9 64H0L36.95 0zm92.38 5l-27.71 48L73.91 5H84.3l17.32 30 17.32-30h10.39zm58.91 12v9.69c-1-.29-2.06-.49-3.2-.49-5.81 0-10 4-10 10V51h-9V17h9v9.2c0-5.08 5.91-9.2 13.2-9.2z" fill="#000"/>\n' +
        '</svg>',
    // Optional wide format logo (ie icon and text) to be displayed in the sidebar of connect modal. Defaults to icon if not provided
    logo: '<svg width="283" height="64" viewBox="0 0 283 64" fill="none" \n' +
        '    xmlns="http://www.w3.org/2000/svg">\n' +
        '    <path d="M141.04 16c-11.04 0-19 7.2-19 18s8.96 18 20 18c6.67 0 12.55-2.64 16.19-7.09l-7.65-4.42c-2.02 2.21-5.09 3.5-8.54 3.5-4.79 0-8.86-2.5-10.37-6.5h28.02c.22-1.12.35-2.28.35-3.5 0-10.79-7.96-17.99-19-17.99zm-9.46 14.5c1.25-3.99 4.67-6.5 9.45-6.5 4.79 0 8.21 2.51 9.45 6.5h-18.9zM248.72 16c-11.04 0-19 7.2-19 18s8.96 18 20 18c6.67 0 12.55-2.64 16.19-7.09l-7.65-4.42c-2.02 2.21-5.09 3.5-8.54 3.5-4.79 0-8.86-2.5-10.37-6.5h28.02c.22-1.12.35-2.28.35-3.5 0-10.79-7.96-17.99-19-17.99zm-9.45 14.5c1.25-3.99 4.67-6.5 9.45-6.5 4.79 0 8.21 2.51 9.45 6.5h-18.9zM200.24 34c0 6 3.92 10 10 10 4.12 0 7.21-1.87 8.8-4.92l7.68 4.43c-3.18 5.3-9.14 8.49-16.48 8.49-11.05 0-19-7.2-19-18s7.96-18 19-18c7.34 0 13.29 3.19 16.48 8.49l-7.68 4.43c-1.59-3.05-4.68-4.92-8.8-4.92-6.07 0-10 4-10 10zm82.48-29v46h-9V5h9zM36.95 0L73.9 64H0L36.95 0zm92.38 5l-27.71 48L73.91 5H84.3l17.32 30 17.32-30h10.39zm58.91 12v9.69c-1-.29-2.06-.49-3.2-.49-5.81 0-10 4-10 10V51h-9V17h9v9.2c0-5.08 5.91-9.2 13.2-9.2z" fill="#000"/>\n' +
        '</svg>',
    // The description of your app
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
  }
})
