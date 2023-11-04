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
    signMessage,
    signTypedData,

} from '@wagmi/core'
import { Network4PolkadotUtil } from "./listNetwork.js";



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
    EIP712TypedData,
    ProviderAccounts,
    ProviderRpcError,
    ProviderRpcErrorCode,
    SubstrateProvider, WalletModule
} from "@web3-onboard/common";

import { caipNetworkIdToNumber, fetchIdentity } from "./utils.js";
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

    private isConnected  = false;

    private NetWork: CaipNetwork = {
        id: 'Ethereum:01'
    }

    private chains : Chain[]

    private _uri: BehaviorSubject<URI>

    private wagmiConfig: Config<any, any>;


    private projectId: string;

    private connector: any;

    public constructor(options: Web3ModalClientOptions) {
        const { chains, url, accountState, projectId} = options

        this._uri = options.uri
        this.chains = chains
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
        this.uri()
        watchAccount( () =>  this.syncAccount())
        watchNetwork(() => this.syncNetwork())

    }


    async uri(){
        await Promise.all([
            // eslint-disable-next-line no-return-assign
            this.connectWalletConnect(),
            // eslint-disable-next-line no-return-assign
            this.connectWalletConnect4Polkadot()
        ])
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
        if(!this.isConnected){
            await connect({ connector, chainId: this.chains[0].id })
        }



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
            await this.universalProvider.connect({
                namespaces : {
                    polkadot: {
                        methods: ['polkadot_signTransaction', 'polkadot_signMessage'],
                        chains: [
                            'polkadot:91b171bb158e2d3848fa23a9f1c25182',
                            'polkadot:afdc188f45c71dacbaa0b62e16a91f72',
                            'polkadot:0f62b701fb12d02237a33b84818c11f6'
                        ],
                        events: ['chainChanged", "accountsChanged']
                    }
                },
                optionalNamespaces : {
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
            }).then(()=>{
                if(this.universalProvider){
                    this.walletConnectSession = this.universalProvider.session;
                }
                this.syncNetwork4Polkadot()
                this.syncAccount4Polkadot()
            })

        }

    }

    async disconnect() {
        await disconnect();
        this.isConnected = false;
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
            this.isConnected = isConnected
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


        const CAIPId = this.options.chainsPolkadot[0].id
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
            id: `polkadot : ${this.options.chainsPolkadot[0].id}`,
            name: this.options.chainsPolkadot[0].label,
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
                const Account : AccountQrConnect = {
                    isConnected
                };
                const caipAddress: CaipAddress = `${NAMESPACE}:${chain.id}:${address}`
                Account.caipAddress = caipAddress
                if (chain.blockExplorers?.default?.url) {
                    const url = `${chain.blockExplorers.default.url}/address/${address}`
                  Account.addressExplorerUrl = url
                } else {
                    Account.addressExplorerUrl = undefined
                }
                if (this.hasSyncedConnectedAccount) {
                    const balance = await this.syncBalance(address, chain)
                    Account.balance = balance.formatted
                    Account.balanceSymbol = balance.symbol
                    // eslint-disable-next-line no-console
                    console.log('ballancce', balance)
                }
                this.Accounts.next([{
                    ...Account,
                    address
                }])
            }
        }
    }

    // eslint-disable-next-line consistent-return
    private async syncProfile(address: Address) {
        try {
            const {name, avatar} = await fetchIdentity({
                caipChainId: `${NAMESPACE}:${this.chains[0].id.toString()}`,
                address
            }, this.projectId)

            return {name, avatar}

        } catch {
            const name = await fetchEnsName({address, chainId: this.chains[0].id})
            if (name) {
                const avatar = await fetchEnsAvatar({name, chainId: this.chains[0].id})
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
                            return`0x${parseInt(caipNetworkIdToNumber(this.Accounts.value[0].caipAddress), 10).toString(16)}`
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
                                // @ts-ignore
                                const signature = await signTypedData(params[1] as EIP712TypedData)

                                return signature || ''
                            }catch (e){
                                throw new ProviderRpcError({
                                    code: ProviderRpcErrorCode.UNSUPPORTED_METHOD,
                                    message: `${(e as Error).message}`
                                })
                            }
                        }
                        if( method === 'wallet_switchEthereumChain'){


                            if (!params) {
                                throw new ProviderRpcError({
                                    code: ProviderRpcErrorCode.INVALID_PARAMS,
                                    message: `The Provider requires a chainId to be passed in as an argument`
                                })
                            }
                            const chainIdObj = params[0] as { chainId : string }

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
                            try{

                                return await switchNetwork({ chainId : parseInt(chainIdObj.chainId, 16), })
                            }catch (e){
                                // eslint-disable-next-line no-console
                                console.log((e as Error).message)
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

