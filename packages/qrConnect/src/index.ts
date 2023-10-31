import type { Address, Chain, Config } from '@wagmi/core'
import {
    connect,
    disconnect,
    fetchBalance,
    fetchEnsAvatar,
    fetchEnsName,
    getAccount,
    getNetwork,
    switchNetwork,
    watchAccount,
    watchNetwork,
    signMessage, signTypedData,
} from '@wagmi/core'
import { Network4PolkadotUtil } from "./listNetwork.js";
import {  mainnet } from "@wagmi/chains";



import UniversalProvider from '@walletconnect/universal-provider'
import {
    AccountQrConnect,
    CaipAddress,
    CaipNetwork,
    CaipNetworkId,
    URI,
    Web3ModalClientOptions
} from './types.js'
import {defaultWagmiConfig} from "@web3modal/wagmi";

import {
    ADD_CHAIN_METHOD,
    NAMESPACE,
    NetworkImageIds,
    WALLET_CHOICE_KEY,
    WALLET_CONNECT_CONNECTOR_ID
} from "./constants.js";
import {SessionTypes} from '@walletconnect/types';
import {
    EIP1193Provider,
    ProviderAccounts,
    ProviderRpcError,
    ProviderRpcErrorCode,
    SubstrateProvider, WalletModule
} from "@web3-onboard/common";

import {caipNetworkIdToNumber, fetchIdentity } from "./utils.js";
import { isHexString } from "@web3-onboard/walletconnect";
import { BehaviorSubject } from "rxjs";






declare global {
    interface Window {
        ethereum?: Record<string, unknown>
    }
}

// -- Types ---------------------------------------------------------------------




// -- Client --------------------------------------------------------------------
export class QrConnect {
    private hasSyncedConnectedAccount = false

    private walletConnectSession: SessionTypes.Struct | undefined;

    private options: Web3ModalClientOptions | undefined = undefined;

    private universalProvider: UniversalProvider | undefined = undefined;

    private Accounts :  BehaviorSubject<AccountQrConnect[]>;

    private TypeWalletConnect:'evm' | 'substrate' | 'null' = 'null'


    private NetWork: CaipNetwork = {
        id: 'Ethereum:01'
    }

    private _uri: BehaviorSubject<URI>

    private wagmiConfig: Config<any, any>;


    private projectId: string;

    private connector: any;

    public constructor(options: Web3ModalClientOptions) {
        const { chains, url, accountState} = options
        let { projectId } = options
        projectId ='16c6ad72b95e09bfdddfde13bf7f90b4'
        this._uri = options.uri
        this.Accounts = accountState
        if ( ! projectId) {
            throw new Error('web3modal:constructor - projectId is undefined')
        }

        this.projectId = projectId;

        this.wagmiConfig = defaultWagmiConfig({
            chains,
            projectId,
            metadata: {
                name: 'Web3Modal React Example',
                url
            }
        })

        if (!this.wagmiConfig) {
            throw new Error('web3modal:constructor - wagmiConfig is undefined')
        }


        if (!this.wagmiConfig.connectors.find(c => c.id === WALLET_CONNECT_CONNECTOR_ID)) {
            throw new Error('web3modal:constructor - WalletConnectConnector is required')
        }


        this.options = options
        watchAccount( () =>  this.syncAccount())
        watchNetwork(() => this.syncNetwork())

    }


    async uri(){

        // eslint-disable-next-line no-return-assign
        try{
            await Promise.all([
                // eslint-disable-next-line no-return-assign
                this.connectWalletConnect(),
                // eslint-disable-next-line no-return-assign
                this.connectWalletConnect4Polkadot()
            ])


        }catch(error){
            throw new Error((error as Error).message)

        }


    }

    async switchCaipNetwork(chainId_ : string ) {
        const chainId = parseInt(chainId_.replace('0x', ''), 10);

        if (chainId) {
            await switchNetwork({ chainId })
        }

        return null
    }

    async getApprovedCaipNetworksData() {
        const walletChoice = localStorage.getItem(WALLET_CHOICE_KEY)
        if (walletChoice?.includes(WALLET_CONNECT_CONNECTOR_ID)) {
            const connector = this.wagmiConfig.connectors.find(c => c.id === WALLET_CONNECT_CONNECTOR_ID)
            if (!connector) {
                throw new Error(
                    'networkControllerClient:getApprovedCaipNetworks - connector is undefined'
                )
            }
            const provider = await connector.getProvider()
            const ns = provider.signer?.session?.namespace
            const nsMethods = ns?.[NAMESPACE]?.methods
            const nsChains = ns?.[NAMESPACE]?.chains

            return {
                supportsAllNetworks: nsMethods?.includes(ADD_CHAIN_METHOD),
                approvedCaipNetworkIds: nsChains as CaipNetworkId[]
            }
        }

        return {approvedCaipNetworkIds: undefined, supportsAllNetworks: true}
    }

    async connectWalletConnect() {
        const connector = this.wagmiConfig.connectors.find(c => c.id === WALLET_CONNECT_CONNECTOR_ID)

        if (!connector) {
            throw new Error('connectionControllerClient:getWalletConnectUri - connector is undefined')
        }


        connector.on('message', (event: { type: string, data?: unknown }) => {
            if (event.type === 'display_uri') {
                // eslint-disable-next-line no-console
                console.log('uri', event.data as string)
                this._uri.next({...this._uri.value, eth : event.data as string})
                connector.removeAllListeners()
            }
        })
        await connect({ connector, chainId: mainnet.id })
    }

    async connectWalletConnect4Polkadot() {

        this.universalProvider = await UniversalProvider.init({
            projectId: this.projectId,
            relayUrl: 'wss://relay.walletconnect.com',
        })

        if(this.universalProvider){
            this.universalProvider.on("display_uri", (uri : string) => {
                // eslint-disable-next-line no-console
                console.log(uri,'uri')
                this._uri.next({...this._uri.value, polkadot: uri})
            })
            this.universalProvider.namespaces = {
                polkadot: {
                    methods: ['polkadot_signTransaction', 'polkadot_signMessage'],
                    chains: [
                        'polkadot:91b171bb158e2d3848fa23a9f1c25182',
                        'polkadot:afdc188f45c71dacbaa0b62e16a91f72',
                        'polkadot:0f62b701fb12d02237a33b84818c11f6'
                    ],
                    events: ['chainChanged", "accountsChanged']
                }
            }

            await this.universalProvider.enable();

            this.walletConnectSession = this.universalProvider.session;
            this.syncNetwork4Polkadot()
            this.syncAccount4Polkadot()
        }

    }

    async disconnect() {
        await disconnect();
        this.resetAccount()
        this.TypeWalletConnect = 'null'
    }

    async  disconnectPolkadot(){
        if (this.walletConnectSession) {
            try{
                await this.universalProvider?.client.disconnect({
                        topic : this.walletConnectSession.topic,
                        reason : {
                                    message: "User disconnected.",
                                    code: 6000
                                }
                });
            }catch(e){
                // eslint-disable-next-line no-console
                console.log((e as Error).message)
            }
        }
        this.walletConnectSession = undefined
        this.TypeWalletConnect = 'null'
        this.resetAccount()
    }

    async signingForEvmWallet() {
        await signMessage({message: 'Hello Im from SubWallet'})
    }

    async signingForPolkadot(address: string, data : string) {

        if (!this.walletConnectSession) {
            return '';
        }

        return `${await this.universalProvider?.client.request({
            topic: this.walletConnectSession.topic,
            request: {
                method: 'polkadot_signMessage',
                params: {
                    address,
                    data,
                    type: 'bytes'
                }
            },
            chainId: `polkadot:${Network4PolkadotUtil['polkadot']}`
        })
        }`
    }


    // -- Private -----------------------------------------------------------------


    public resetAccount() {
        this.Accounts.next([])
        this.TypeWalletConnect = 'null'
    }


    private async syncAccount() {
        const {address, isConnected} = getAccount()

        const {chain} = getNetwork()
        this.resetAccount()
        if (isConnected && address && chain) {
            this.TypeWalletConnect = 'evm'
            const caipAddress: CaipAddress = `${NAMESPACE}:${chain.id}:${address}`

            const properties = await Promise.all([
                this.syncProfile(address),
                this.syncBalance(address, chain),
                this.getApprovedCaipNetworksData()
            ])
            const Accounts_ = this.Accounts.value
            Accounts_.push({
                isConnected,
                caipAddress,
                address,
                balance: properties[1].formatted,
                balanceSymbol: properties[1].symbol,
                profileName: properties[0].name,
                profileImage: properties[0].avatar
            })
            this.Accounts.next(Accounts_)
            this.hasSyncedConnectedAccount = true
        } else if (!isConnected && this.hasSyncedConnectedAccount) {
            this.TypeWalletConnect = 'null'
            this._uri.next({ ...this._uri.value, eth : '' } )
        }
    }

    // eslint-disable-next-line @typescript-eslint/require-await
    private syncAccount4Polkadot() {
        if (!this.walletConnectSession || !this.options?.chainsPolkadot) {
            return;
        }

        const walletConnectAccount = Object.values(this.walletConnectSession.namespaces)
            .map(namespace => namespace.accounts)
            .flat()

        const CAIPId = Network4PolkadotUtil[this.options?.chainsPolkadot[0] as keyof typeof Network4PolkadotUtil]
        const walletAccountfillter = walletConnectAccount.filter((account) => (
            account.includes(CAIPId)
        )).map((account) => (account.replace(`polkadot:${CAIPId}:`, "")))

        if (walletConnectAccount.length > 0 && this.options?.chainsPolkadot[0]) {
            this.resetAccount()
            this.TypeWalletConnect = 'substrate'
            const Accounts_ = this.Accounts.value
            walletAccountfillter.forEach((account, index) => {
                const caipAddress: CaipAddress = `polkadot:${CAIPId}:${account}`
                this.getApprovedCaipNetworksData()
                this.hasSyncedConnectedAccount = true
                Accounts_.push({
                    isConnected: true,
                    caipAddress,
                    address: account,
                    balance: '0',
                    profileName: `Account ${index + 1}`
                })
            })
            this.Accounts.next(Accounts_)
        } else {
            this._uri.next({ ...this._uri.value, polkadot : '' } )
        }

    }

    private syncNetwork4Polkadot() {
        if (!this.walletConnectSession || !this.options?.chainsPolkadot) {
            return;
        }
        this.NetWork = {
            id: `polkadot : ${Network4PolkadotUtil[this.options?.chainsPolkadot[0] as keyof typeof Network4PolkadotUtil]}`,
            name: this.options.chainsPolkadot[0],
            imageId: '',
            imageUrl: ''
        }
    }

    private async syncNetwork() {
        const {address, isConnected} = getAccount()
        const {chain} = getNetwork()

        if (chain) {
            const chainId = String(chain.id)
            const caipChainId: CaipNetworkId = `${NAMESPACE}:${chainId}`
            this.NetWork = {
                id: caipChainId,
                name: chain.name,
                imageId: NetworkImageIds[chain.id],
                imageUrl: this.options?.chainImages?.[chain.id]
            }
            if (isConnected && address && this.Accounts.value.length > 0) {
                const caipAddress: CaipAddress = `${NAMESPACE}:${chain.id}:${address}`
                this.Accounts.value[0].caipAddress = caipAddress
                if (chain.blockExplorers?.default?.url) {
                    const url = `${chain.blockExplorers.default.url}/address/${address}`
                    this.Accounts.value[0].addressExplorerUrl = url
                } else {
                    this.Accounts.value[0].addressExplorerUrl = undefined
                }
                if (this.hasSyncedConnectedAccount) {
                    await this.syncBalance(address, chain)
                }
            }
        }
    }

    // eslint-disable-next-line consistent-return
    private async syncProfile(address: Address) {
        try {
            const {name, avatar} = await fetchIdentity({
                caipChainId: `${NAMESPACE}:${mainnet.id}`,
                address
            }, this.projectId)

            return {name, avatar}

        } catch {
            const name = await fetchEnsName({address, chainId: mainnet.id})
            if (name) {
                const avatar = await fetchEnsAvatar({name, chainId: mainnet.id})
                if (avatar) {

                    return {name, avatar}
                }

                return {name, avatar: ''}
            }
        }

        return {name: '', avatar: ''}
    }

    private async syncBalance(address: Address, chain: Chain) {
        const balance = await fetchBalance({
            address,
            chainId: chain.id,
            token: this.options?.tokens?.[chain.id]?.address as Address
        })

        return balance
    }





    public walletConnect(): WalletModule  {
        return{
            // eslint-disable-next-line no-negated-condition
            type: this.TypeWalletConnect !== 'null' ? this.TypeWalletConnect : 'evm',
            // eslint-disable-next-line no-negated-condition
            label: this.TypeWalletConnect === 'evm' ? 'QrCodeEvm' : 'QrCodePolkadot',
            getIcon: async () => (await import('./icon.js')).default,
            // eslint-disable-next-line @typescript-eslint/require-await
            getInterface: async () => {
                const EthProvider : EIP1193Provider = {


                    disconnect: async () => {
                        await this.disconnect()
                    },
                    // eslint-disable-next-line @typescript-eslint/no-empty-function
                    on : ()=>{},

                    // eslint-disable-next-line @typescript-eslint/no-empty-function
                    removeListener : () => {},

                    request : async ({method, params}) => {
                        if (method === 'eth_chainId') {
                            return isHexString(caipNetworkIdToNumber(this.Accounts.value[0].caipAddress))
                                ? caipNetworkIdToNumber(this.Accounts.value[0].caipAddress)
                                : `0x${caipNetworkIdToNumber(this.Accounts.value[0].caipAddress)}`
                        }

                        if (method === 'eth_requestAccounts') {
                            return new Promise<ProviderAccounts>(
                                // eslint-disable-next-line @typescript-eslint/require-await
                                async (resolve) => {
                                    const address = this.Accounts.value.map( (account) => account.address|| '')

                                    // eslint-disable-next-line no-promise-executor-return
                                    return resolve(address);
                                }
                            )
                        }

                        if (method === 'eth_selectAccounts') {
                            throw new ProviderRpcError({
                                code: ProviderRpcErrorCode.UNSUPPORTED_METHOD,
                                message: `The Provider does not support the requested method: ${method}`
                            })
                        }

                        if (method === 'wallet_switchEthereumChain') {
                            if (!params) {
                                throw new ProviderRpcError({
                                    code: ProviderRpcErrorCode.INVALID_PARAMS,
                                    message: `The Provider requires a chainId to be passed in as an argument`
                                })
                            }
                            const chainIdObj = params[0] as { chainId?: number }
                            if (
                                // eslint-disable-next-line no-prototype-builtins
                                !chainIdObj.hasOwnProperty('chainId') ||
                                typeof chainIdObj['chainId'] === 'undefined'
                            ) {
                                throw new ProviderRpcError({
                                    code: ProviderRpcErrorCode.INVALID_PARAMS,
                                    message: `The Provider requires a chainId to be passed in as an argument`
                                })
                            }


                            return this.switchCaipNetwork(chainIdObj.chainId.toString())
                        }
                        if( method === 'eth_sign') {
                            if (!params) {
                                throw new ProviderRpcError({
                                    code: ProviderRpcErrorCode.INVALID_PARAMS,
                                    message: `The Provider requires a chainId to be passed in as an argument`
                                })
                            }

                            const signature = await signMessage({message: params[1] as string})

                            return signature || ''
                        }

                        if( method === 'personal_sign'){
                            if (!params) {
                                throw new ProviderRpcError({
                                    code: ProviderRpcErrorCode.INVALID_PARAMS,
                                    message: `The Provider requires a chainId to be passed in as an argument`
                                })
                            }

                            const signature = await signMessage({message: params[0] as string})

                            return signature || ''
                        }

                        if( method === 'eth_signTypedData' || method === 'eth_signTypedData_v4'){
                            if (!params) {
                                throw new ProviderRpcError({
                                    code: ProviderRpcErrorCode.INVALID_PARAMS,
                                    message: `The Provider requires a chainId to be passed in as an argument`
                                })
                            }

                            try{
                                const signature = await signTypedData(params[1])

                                return signature || ''

                            }catch (e){
                                throw new ProviderRpcError({
                                    code: ProviderRpcErrorCode.UNSUPPORTED_METHOD,
                                    message: `${(e as Error).message}`
                                })
                            }


                        }


                     // @ts-expect-error
                        return this.connector.request<Promise<any>>({
                            method,
                            params
                        })
                    }
                }

                const SubstarteProvider : SubstrateProvider = {

                    // eslint-disable-next-line @typescript-eslint/require-await,consistent-return
                    enable: async ()=> {
                        if(this.Accounts.value.length > 0 && this.TypeWalletConnect === 'substrate'){
                            const address = this.Accounts.value.map( (account) => account.address|| '')

                            return { address,
                                signer : undefined };
                        }
                    },

                    signDummy : async (address: string, message: string) => await this.signingForPolkadot(address, message),

                    disconnect: async () => {
                        await this.disconnectPolkadot()
                    }

                }
                if(this.TypeWalletConnect === 'evm'){
                    return {
                        provider : EthProvider
                    }
                }

                return {
                    provider: SubstarteProvider
                }
            }
        }
    }
}

