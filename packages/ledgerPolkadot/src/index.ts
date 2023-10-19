import type {Chain, Platform, SubstrateProvider, WalletInit} from '@web3-onboard/common'
import type { StaticJsonRpcProvider } from '@ethersproject/providers'
import TransportWebUSB from "@ledgerhq/hw-transport-webusb";
import Polkadot from "@ledgerhq/hw-app-polkadot";


import type {
    ScanAccountsOptions,
    Account,
    Asset
} from '@web3-onboard/hw-common'

const DEFAULT_PATH = "44'/354'/0'/0/0"

const DEFAULT_BASE_PATHS = [
    {
        label: 'Polkadot',
        value: DEFAULT_PATH
    }
]

const assets = [
    {
        label: 'ETH'
    }
]

const ERROR_BUSY: ErrorCode = 'busy'
const ERROR_PAIRING: ErrorCode = 'pairing'
const ERROOR_CHOICEPOLKADOT : ErrorCode = 'choice'

const errorMessages = {
    [ERROR_BUSY]: `Your Ledger is currently connected to another application.
  Please close any other browser tabs or applications that may be connected to your device and try again.`,
    [ERROR_PAIRING]:
        'There was an error pairing the device. Please disconnect and reconnect the device and try again.',
    [ERROOR_CHOICEPOLKADOT] :
        'Please Ready Polkadot application in your Ledger hardwallet'

}

type ErrorCode = 'busy' | 'pairing' | 'choice'

function keepkey({
                     filter,
                     containerElement,
                     consecutiveEmptyAccountThreshold
                 }: {
    filter?: Platform[]
    containerElement?: string
    /**
     * A number that defines the amount of consecutive empty addresses displayed
     * within the Account Select modal. Default is 5
     */
    consecutiveEmptyAccountThreshold?: number
} = {}): WalletInit {
    const getIcon = async () => (await import('./icon.js')).default

    return ({ device }) => {
        let accounts: Account[] | undefined

        const filtered =
            Array.isArray(filter) &&
            (filter.includes(device.type) || filter.includes(device.os.name))

        if (filtered) return null

        return {
            type: 'substrate',
            label: 'Ledger Polkadot',
            getIcon,
            getInterface: async ({ EventEmitter, chains }) => {


                const { createEIP1193Provider, ProviderRpcError } = await import(
                    '@web3-onboard/common'
                    )

                const { accountSelect, entryModal } = await import(
                    '@web3-onboard/hw-common'
                    )

                const { bigNumberFieldsToStrings, getHardwareWalletProvider } =
                    await import('@web3-onboard/hw-common')

                const { utils } = await import('ethers')

                const { StaticJsonRpcProvider } = await import(
                    '@ethersproject/providers'
                    )
                const ethUtil = await import('ethereumjs-util')

                const transport = await TransportWebUSB.create();
                const ledgerWallet = new Polkadot(transport);
                const eventEmitter = new EventEmitter()
                const consecutiveEmptyAccounts = consecutiveEmptyAccountThreshold || 5

                let currentChain: Chain = chains[0]

                const getPaths = (accountIdx: number): string => {
                    // Retrieve the array form of the derivation path for a given account index
                    return DEFAULT_PATH.replace("'/0'", `'/${accountIdx}'`)
                }

                const getAccount = async ({
                                              accountIdx,
                                              provider,
                                              asset
                                          }: {
                    accountIdx: number
                    provider: StaticJsonRpcProvider
                    asset: Asset
                }) => {
                    const paths = getPaths(accountIdx)
                    let address = ''
                    try{
                        const account= await ledgerWallet.getAddress(paths);
                        address = account.address
                    }catch (e){
                        console.log((e as Error). message);
                        throw new ProviderRpcError({
                            code: 4001,
                            message: errorMessages[ERROOR_CHOICEPOLKADOT]
                        })

                    }
                    // Retrieve the address associated with the given account index


                    const balance = await provider.getBalance( address  )

                    return {
                        derivationPath: paths,
                        address,
                        balance: {
                            asset: asset.label || 'DOT',
                            value: balance || 0
                        }
                    }
                }

                const getAllAccounts = async ({
                                                  derivationPath,
                                                  asset,
                                                  provider
                                              }: {
                    derivationPath: string
                    asset: Asset
                    provider: StaticJsonRpcProvider
                }) => {
                    try {
                        let index = 0
                        let zeroBalanceAccounts = 0
                        const accounts = []

                        // Iterates until a 0 balance account is found
                        // Then adds 4 more 0 balance accounts to the array
                        while (zeroBalanceAccounts < consecutiveEmptyAccounts) {
                            const acc = await getAccount({
                                accountIdx: index,
                                provider,
                                asset
                            })

                            if (
                                acc &&
                                acc.balance &&
                                acc.balance.value &&
                                acc.balance.value.isZero()
                            ) {
                                zeroBalanceAccounts++
                                accounts.push(acc)
                            } else {
                                accounts.push(acc)
                                // Reset the number of 0 balance accounts
                                zeroBalanceAccounts = 0
                            }

                            index++
                        }

                        return accounts
                    } catch (error) {
                        throw new Error(
                            (error as { message: { message: string } }).message.message
                        )
                    }
                }
                let ethersProvider: StaticJsonRpcProvider
                const scanAccounts = async ({
                                                derivationPath,
                                                chainId,
                                                asset
                                            }: ScanAccountsOptions): Promise<Account[]> => {
                    if (! ledgerWallet )
                        throw new Error('Device must be connected before scanning accounts')
                    currentChain = chains.find(({ id }) => id === chainId) || currentChain
                    ethersProvider = new StaticJsonRpcProvider(currentChain.rpcUrl)

                    // Checks to see if this is a custom derivation path
                    // If it is then just return the single account
                    if (
                        !DEFAULT_BASE_PATHS.find(({ value }) => value === derivationPath)
                    ) {
                        try {
                            const accountIdx = 0;
                            const account = await getAccount({
                                accountIdx,
                                provider: ethersProvider,
                                asset
                            })

                            return [account]
                        } catch (error) {
                            throw new Error('Invalid derivation path')
                        }
                    }

                    return getAllAccounts({
                        derivationPath,
                        asset,
                        provider: ethersProvider
                    })
                }

                const getAccounts = async () => {
                    accounts = await accountSelect({
                        basePaths: DEFAULT_BASE_PATHS,
                        assets,
                        chains,
                        scanAccounts,
                        containerElement
                    })
                    if (!accounts) throw new Error('No accounts were found')
                    if (accounts.length) {
                        eventEmitter.emit('accountsChanged', [accounts[0].address])
                    }

                    return accounts
                }

                const signMessage = async (address: string, message: string) => {
                    if (
                        !accounts ||
                        !Array.isArray(accounts) ||
                        !(accounts.length && accounts.length > 0)
                    )
                        throw new Error(
                            'No account selected. Must call eth_requestAccounts first.'
                        )

                    const account =
                        accounts.find(account => account.address === address) || accounts[0]

                    const { derivationPath } = account

                    const { signature } = await ledgerWallet.sign(
                      derivationPath,
            message.slice(0, 2) === '0x'
                                    ? // @ts-ignore - commonjs weirdness
                            (ethUtil.default || ethUtil)
                                .toBuffer(message)
                                .toString('utf8')
                            : message
                    )
                    return signature
                }

                const keepKeyProvider = getHardwareWalletProvider(
                    () => currentChain.rpcUrl || ''
                )

                const provider : SubstrateProvider = {
                    async enable  () => {
                        if (keepKeyWallet && typeof keepKeyWallet.cancel === 'function') {
                            // cancel any current actions on device
                            keepKeyWallet.cancel()
                        }

                        try {
                            keepKeyWallet =
                                (await keepKeyAdapter.pairDevice()) as KeepKeyHDWallet
                        } catch (error) {
                            const { name } = error as { name: string }
                            // This error indicates that the keepkey is paired with another app
                            if (name === HDWalletErrorType.ConflictingApp) {
                                throw new ProviderRpcError({
                                    code: 4001,
                                    message: errorMessages[ERROR_BUSY]
                                })

                                // This error indicates that for some reason we can't claim the usb device
                            } else if (name === HDWalletErrorType.WebUSBCouldNotPair) {
                                throw new ProviderRpcError({
                                    code: 4001,
                                    message: errorMessages[ERROR_PAIRING]
                                })
                            }
                        }

                        // Triggers the account select modal if no accounts have been selected
                        const accounts = await getAccounts()

                        if (!accounts || !Array.isArray(accounts)) {
                            throw new Error('No accounts were returned from Keepkey device')
                        }
                        if (!accounts.length) {
                            throw new ProviderRpcError({
                                code: 4001,
                                message: 'User rejected the request.'
                            })
                        }
                        if (!accounts[0].hasOwnProperty('address')) {
                            throw new Error(
                                'The account returned does not have a required address field'
                            )
                        }

                        return [accounts[0].address]
                    },
                    eth_selectAccounts: async () => {
                        const accounts = await getAccounts()
                        return accounts.map(({ address }) => address)
                    },
                    eth_accounts: async () => {
                        if (!accounts || !Array.isArray(accounts)) {
                            throw new Error('No accounts were returned from Keepkey device')
                        }
                        return accounts[0].hasOwnProperty('address')
                            ? [accounts[0].address]
                            : []
                    },
                    eth_chainId: async () => {
                        return currentChain && currentChain.id != undefined
                            ? currentChain.id
                            : '0x0'
                    },
                    eth_signTransaction: async ({ params: [transactionObject] }) => {
                        if (!accounts || !Array.isArray(accounts) || !accounts.length)
                            throw new Error(
                                'No account selected. Must call eth_requestAccounts first.'
                            )

                        // Per the code above if accounts is empty or undefined then this line of code won't execute
                        // ∴ account must be defined here which is why it is cast without the 'undefined' type
                        const account =
                            !transactionObject || !transactionObject.hasOwnProperty('from')
                                ? accounts[0]
                                : (accounts.find(
                                    account =>
                                        account.address.toLocaleLowerCase() ===
                                        transactionObject.from.toLocaleLowerCase()
                                ) as Account)

                        const { derivationPath, address } = account
                        const addressNList = bip32ToAddressNList(derivationPath)

                        const signer = ethersProvider.getSigner(address)

                        transactionObject.gasLimit =
                            transactionObject.gas || transactionObject.gasLimit

                        // 'gas' is an invalid property for the TransactionRequest type
                        delete transactionObject.gas

                        transactionObject.gasLimit = undefined

                        let populatedTransaction = await signer.populateTransaction(
                            transactionObject
                        )

                        const {
                            to,
                            value,
                            nonce,
                            gasLimit,
                            gasPrice,
                            maxFeePerGas,
                            maxPriorityFeePerGas,
                            data
                        } = bigNumberFieldsToStrings(populatedTransaction)

                        const gasData = gasPrice
                            ? {
                                gasPrice
                            }
                            : {
                                maxFeePerGas,
                                maxPriorityFeePerGas
                            }

                        const txn = {
                            addressNList,
                            chainId: parseInt(currentChain.id),
                            to: to || '',
                            value: value || '',
                            nonce: utils.hexValue(nonce),
                            gasLimit: gasLimit || '0x0',
                            data: (data || '').toString(),
                            ...gasData
                        }

                        let serialized
                        try {
                            ;({ serialized } = await keepKeyWallet.ethSignTx(txn))
                        } catch (error: any) {
                            if (error.message && error.message.message) {
                                throw new Error(error.message.message)
                            } else {
                                throw new Error(error)
                            }
                        }
                        return serialized
                    },
                    eth_sendTransaction: async ({ baseRequest, params }) => {
                        const signedTx = await provider.request({
                            method: 'eth_signTransaction',
                            params
                        })

                        const transactionHash = await baseRequest({
                            method: 'eth_sendRawTransaction',
                            params: [signedTx]
                        })

                        return transactionHash as string
                    },
                    eth_sign: async ({ params: [address, message] }) =>
                        signMessage(address, message),
                    personal_sign: async ({ params: [message, address] }) =>
                        signMessage(address, message),
                    eth_signTypedData: null,
                    wallet_switchEthereumChain: async ({ params: [{ chainId }] }) => {
                        currentChain =
                            chains.find(({ id }) => id === chainId) || currentChain

                        if (!currentChain)
                            throw new Error('chain must be set before switching')

                        eventEmitter.emit('chainChanged', currentChain.id)
                        return null
                    },
                    wallet_addEthereumChain: null
                })

                provider.on = eventEmitter.on.bind(eventEmitter)

                return {
                    provider,
                    instance: {
                        selectAccount: getAccounts
                    }
                }
            }
        }
    }
}

export default keepkey
