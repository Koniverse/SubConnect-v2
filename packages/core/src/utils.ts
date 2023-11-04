import bowser from 'bowser'
import axios from 'axios';
import type {
  Device,
  DeviceBrowser,
  DeviceOS,
  DeviceType,
  ChainId,
  Chain,
  WalletInit,
  WalletModule,
  ChainWithDecimalId
} from '@web3-onboard/common'

import {
  hourglass,
  gnosisIcon,
  checkmark,
  errorIcon,
  infoIcon,
  ethereumIcon,
  polygonIcon,
  binanceIcon,
  questionIcon,
  fantomIcon,
  optimismIcon,
  celoIcon,
  avalancheIcon,
  harmonyOneIcon,
  arbitrumIcon,
  baseIcon,
  polkadotIcon,
  crutsIcon,
  acalaIcon,
  astarNetworkIcon,
  hydraxIcon,
  kusamaIcon,
  phalaNetworkIcon,
  statemint,
  turingNetworkIcon,
  westendIcon
} from './icons/index.js'

import type {
  ChainStyle,
  ConnectedChain,
  DeviceNotBrowser,
  NotifyEventStyles
} from './types.js'

export function getDevice(): Device | DeviceNotBrowser {
  if (typeof window !== 'undefined') {
    const parsed = bowser.getParser(window.navigator.userAgent)
    const os = parsed.getOS()
    const browser = parsed.getBrowser()
    const { type } = parsed.getPlatform()

    return {
      type: type as DeviceType,
      os: os as DeviceOS,
      browser: browser as DeviceBrowser
    }
  } else {
    return {
      type: null,
      os: null,
      browser: null
    }
  }
}

export const notNullish = <T>(value: T | null | undefined): value is T =>
  value != null

export function validEnsChain(chainId: ChainId): ChainId | null {
  // return L2s as Eth for ens resolution
  switch (chainId) {
    case '0x1':
    case '0x89': // Polygon
    case '0xa': //Optimism
    case '0xa4b1': // Arb One
    case '0xa4ba': // Arb Nova
    case '0x144': // zksync
      return '0x1'
    case '0x5': // Goerli
      return chainId
    case '0xaa36a7': // Sepolia
      return chainId
    default:
      return null
  }
}

export function isSVG(str: string): boolean {
  return str.includes('<svg')
}

export function shortenAddress(add: string): string {
  return `${add.slice(0, 6)}…${add.slice(-4)}`
}

export function shortenDomain(domain: string): string {
  return domain.length > 11
    ? `${domain.slice(0, 4)}…${domain.slice(-6)}`
    : domain
}

export async function copyWalletAddress(text: string): Promise<void> {
  try {
    const copy = await navigator.clipboard.writeText(text)
    return copy
  } catch (err) {
    console.error('Failed to copy: ', err)
  }
}

export const toHexString = (val: number | string): string =>
  typeof val === 'number' ? `0x${val.toString(16)}` : val

export function chainIdToHex(chains: (Chain | ChainWithDecimalId)[]): Chain[] {
  return chains.map(({ id, ...rest }) => {
    const hexId = toHexString(id)
    return { id: hexId, ...rest }
  })
}

export function gweiToWeiHex(gwei: number): string {
  return `0x${(gwei * 1e9).toString(16)}`
}

export const chainIdToLabel: Record<string, string> = {
  '0x1': 'Ethereum',
  '0x3': 'Ropsten',
  '0x4': 'Rinkeby',
  '0x5': 'Goerli',
  '0xaa36a7': 'Sepolia',
  '0x2a': 'Kovan',
  '0x38': 'Binance',
  '0x89': 'Polygon',
  '0xfa': 'Fantom',
  '0xa': 'Optimism',
  '0x45': 'Optimism Kovan',
  '0xa86a': 'Avalanche',
  '0xa4ec': 'Celo',
  '0x2105': 'Base',
  '0x14a33': 'Base Goerli',
  '0x64': 'Gnosis',
  '0x63564C40': 'Harmony One',
  '0xa4b1': 'Arbitrum One',
  '0xa4ba': 'Arbitrum Nova',
  '91b171bb158e2d3848fa23a9f1c25182' : 'Polkadot',
  'acala' : 'Acala',
  '9eb76c5184c4ab8679d2d5d819fdf90b' : 'Astar Network',
  'd4c0c08ca49dc7c680c3dac71a7c0703' : 'Crust',
  'afdc188f45c71dacbaa0b62e16a91f72' : 'Hydradx',
  'b0a8d493285c2df73290dfb7e61f870f' : 'Kusama',
  '1bb969d85965e4bb5a651abbedf21a54' : 'Phala Network',
  '68d56f15f85d3136970ec16946040bc1' : 'Statemint',
  '0f62b701fb12d02237a33b84818c11f6' : 'Turing Network',
  'e143f23803ac50e8f6f8e62695d1ce9e' : 'Westend'
}

export const networkToChainId: Record<string, ChainId> = {
  main: '0x1',
  ropsten: '0x3',
  rinkeby: '0x4',
  goerli: '0x5',
  kovan: '0x2a',
  xdai: '0x64',
  'bsc-main': '0x38',
  'matic-main': '0x89',
  'fantom-main': '0xfa',
  'matic-mumbai': '0x80001',
}




export const chainStyles: Record<string, ChainStyle> = {
  '0x1': {
    icon : ethereumIcon,
    color : '#627EEA'
  },
  '0x3': {
    icon : ethereumIcon,
    color : '#627EEA'
  },
  '0x4': {
    icon : ethereumIcon,
    color : '#627EEA'
  },
  '0x5': {
    icon : ethereumIcon,
    color : '#627EEA'
  },
  '0x2a': {
    icon : ethereumIcon,
    color : '#627EEA'
  },
  '0xaa36a7': {
    icon : ethereumIcon,
    color : '#627EEA'
  },
  '0x38': {
    icon : binanceIcon,
    color : '#F3BA2F'
  },
  '0x89': {
    icon : polygonIcon,
    color : '#8247E5'
  },
  '0xfa': {
    icon : fantomIcon,
    color : '#1969FF'
  },
  '0xa': {
    icon : optimismIcon,
    color : '#FF0420'
  },
  '0x45': {
    icon : optimismIcon,
    color : '#FF0420'
  },
  '0xa86a': {
    icon : avalancheIcon,
    color : '#E84142'
  },
  '0xa4ec': {
    icon : celoIcon,
    color : '#FBCC5C'
  },
  '0x64': {
    icon : gnosisIcon,
    color : '#04795B'
  },
  '0x63564C40': {
    icon : harmonyOneIcon,
    color : '#ffffff'
  },
  '0xa4b1':  {
    icon: arbitrumIcon,
    color: '#33394B'
  },
  '0xa4ba': {
    icon : arbitrumIcon,
    color : '#33394B'
  },
  '0x2105': {
    icon : baseIcon,
    color : '#0259F9'
  },
  '0x14a33': {
    icon : baseIcon,
    color : '#0259F9'
  },
  '0x80001': {
    icon : polygonIcon,
    color : '#8247E5'
  },
  '91b171bb158e2d3848fa23a9f1c25182' : {
    icon : polkadotIcon,
    color : '#ffffff'
  },
  'acala' : {
    icon : acalaIcon,
    color : '#ffffff'
  },
  '9eb76c5184c4ab8679d2d5d819fdf90b' : {
    icon : astarNetworkIcon,
    color : '#ffffff'
  },
  'd4c0c08ca49dc7c680c3dac71a7c0703' : {
    icon: crutsIcon,
    color: '#000000'
  },
  'afdc188f45c71dacbaa0b62e16a91f72' : {
    icon : hydraxIcon,
    color : '#f453a1'
  },
  'b0a8d493285c2df73290dfb7e61f870f' : {
    icon : kusamaIcon,
    color: '#000000'
  },
  '1bb969d85965e4bb5a651abbedf21a54' : {
    icon : phalaNetworkIcon,
    color: '#000000'
  },
  '68d56f15f85d3136970ec16946040bc1' : {
    icon : statemint,
    color : '#000000'
  },
  '0f62b701fb12d02237a33b84818c11f6' : {
    icon : turingNetworkIcon,
    color: '#ffffff'
  },
  'e143f23803ac50e8f6f8e62695d1ce9e' : {
    icon : westendIcon,
    color: '#ffffff'
  }
}

export const unrecognizedChainStyle = { icon: questionIcon, color: '#33394B' }

export function getDefaultChainStyles(chainId: string): ChainStyle | undefined {
  return chainId ? chainStyles[chainId.toLowerCase()] : undefined
}

export function connectedToValidAppChain(
  walletConnectedChain: ConnectedChain,
  chains: Chain[]
): boolean {
  return !!chains.find(
    ({ id, namespace }) =>
      id === walletConnectedChain.id &&
      namespace === walletConnectedChain.namespace
  )
}

export function initializeWalletModules(
  modules: WalletInit[],
  device: Device
): WalletModule[] {
  return modules.reduce((acc, walletInit) => {
    const initialized = walletInit({ device })

    if (initialized) {
      // injected wallets is an array of wallets
      acc.push(...(Array.isArray(initialized) ? initialized : [initialized]))
    }

    return acc
  }, [] as WalletModule[])
}

export const defaultNotifyEventStyles: Record<string, NotifyEventStyles> = {
  pending: {
    backgroundColor: 'var(--onboard-primary-700, var(--primary-700))',
    borderColor: '#6370E5',
    eventIcon: hourglass
  },
  success: {
    backgroundColor: '#052E17',
    borderColor: 'var(--onboard-success-300, var(--success-300))',
    eventIcon: checkmark
  },
  error: {
    backgroundColor: '#FDB1B11A',
    borderColor: 'var(--onboard-danger-300, var(--danger-300))',
    eventIcon: errorIcon
  },
  hint: {
    backgroundColor: 'var(--onboard-gray-500, var(--gray-500))',
    borderColor: 'var(--onboard-gray-500, var(--gray-500))',
    iconColor: 'var(--onboard-gray-100, var(--gray-100))',
    eventIcon: infoIcon
  }
}

export const wait = (time: number): Promise<void> =>
  new Promise(resolve => setTimeout(resolve, time))

export function getLocalStore(key: string): string | null {
  try {
    const result = localStorage.getItem(key)
    return result
  } catch (error) {
    return null
  }
}

export function setLocalStore(key: string, value: string): void {
  try {
    localStorage.setItem(key, value)
  } catch (error) {
    return
  }
}

export function delLocalStore(key: string): void {
  try {
    localStorage.removeItem(key)
  } catch (error) {
    return
  }
}

export const baseURL = 'https://*/api/scan/account/tokens';

export type dataTypeFetch  = {
  address : string
}
export interface  clientAxiosProps {
  url : string,
  data: dataTypeFetch
};


export async function getBalanceSubstrate({ url, data } : clientAxiosProps){
    if(url === '') return
    const urlResult = baseURL.replace('*', url);
    return await axios.post(urlResult, data)
        .then( data_ => {
          return data_.data.data ? data_.data.data.native[0].balance : '0';
        })

}