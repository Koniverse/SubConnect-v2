import { Chain, WindowProvider } from "@wagmi/core";
import { BehaviorSubject } from "rxjs";
import { Chain as Chain_ } from '@web3-onboard/common';


export type Tokens = Record<CaipNetworkId, Token>

export interface Token {
    address: string
    image?: string
}
export type CaipNetworkId = `${string}:${string}`

export interface CaipNetwork {
    id: CaipNetworkId
    name?: string
    imageId?: string
    imageUrl?: string
}

export type CaipAddress = `${string}:${string}:${string}`

export type Connector = {
    id: string
    type: ConnectorType
    name?: string
    imageId?: string
    explorerId?: string
    imageUrl?: string
    info?: unknown
    provider?: unknown
}


export type URI = {
    polkadot : string
    eth : string
}

export interface AccountQrConnect{
    isConnected: boolean,
    caipAddress?: CaipAddress
    address?: string
    balance?: string
    balanceSymbol?: string
    profileName?: string
    profileImage?: string
    addressExplorerUrl?: string
}

export type ConnectorType = 'WALLET_CONNECT' | 'WALLET_CONNECT_POLKADOT';

export interface Web3ModalClientOptions  {
    chainsPolkadot ?: Chain_[],
    uri : BehaviorSubject<URI>,
    accountState : BehaviorSubject<AccountQrConnect[]>,
    url : string,
    chains: Chain[]
    projectId : string
    defaultChain?: Chain
    chainImages?: Record<number, string>
    connectorImages?: Record<string, string>
    tokens?: Record<number, Token>,
}

export type Web3ModalOptions = Omit<Web3ModalClientOptions, '_sdkVersion'>




export interface Info {
    uuid: string
    name: string
    icon: string
    rdns: string
}

export interface Wallet {
    info: Info
    provider: WindowProvider
}

export interface BlockchainApiIdentityRequest {
    caipChainId: CaipNetworkId
    address: string
}

export interface BlockchainApiIdentityResponse {
    avatar: string
    name: string
}