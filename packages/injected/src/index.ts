import uniqBy from 'lodash.uniqby'
import type { WalletInit } from '@subwallet_connect/common'
import { ProviderLabel } from './types.js'
import standardWallets from './wallets.js'
import { validateWalletOptions } from './validation.js'
import { defaultWalletUnavailableMsg, isWalletAvailable } from './helpers.js'

import type {
    InjectedWalletOptions,
    CustomWindow,
    InjectedWalletModule
} from './types.js'
import {InjectedWindow} from "@polkadot/extension-inject/types";

declare const window: CustomWindow

export { ProviderIdentityFlag, ProviderLabel } from './types.js'

function injected(options?: InjectedWalletOptions): WalletInit  {
    if (typeof window === 'undefined') return () => null

    if (options) {
        const result = validateWalletOptions(options)

        if (result && result.error) throw result.error
    }


    return helpers => {
        const { device } = helpers

        const {
            custom = [],
            filter = {},
            displayUnavailable,
            sort,
            walletUnavailableMessage
        } = options || {}

        // combine custom with standard wallets and dedupe
        const allWallets = uniqBy(
            [...custom, ...standardWallets],
            ({ label, type }) => [label, type]
        )

        const wallets = allWallets.reduce(
            (acc: InjectedWalletModule[], wallet: InjectedWalletModule) => {
                const { label, platforms, injectedNamespace, checkProviderIdentity, type } =
                    wallet

                let walletAvailable = false;
                if(type === 'evm'){
                    // @ts-ignore
                    const provider = window[injectedNamespace] as CustomWindow['ethereum']

                    walletAvailable = isWalletAvailable(
                        provider,
                        checkProviderIdentity,
                        device
                    )
                }else{
                  const injectedWindow = window as unknown as Window & InjectedWindow;
                  walletAvailable =  !!injectedWindow?.injectedWeb3[wallet.injectedNamespace];
                }
                const walletFilters = filter[label]
                const filteredWallet = walletFilters === false
                let excludedDevice: boolean = false

                // dev specified platform filters
                if (
                    Array.isArray(walletFilters) &&
                    (walletFilters.includes(device.type) ||
                        walletFilters.includes(device.os.name))
                ) {
                    excludedDevice = true
                }

                // unavailable filter
                if (walletFilters === 'unavailable' && !walletAvailable) {
                    excludedDevice = true
                }

                // wallet specified platform filters
                const invalidPlatform =
                    !platforms.includes('all') &&
                    !platforms.includes(device.type) &&
                    !platforms.includes(device.os.name)

                const supportedWallet =
                    !filteredWallet &&
                    !excludedDevice &&
                    !invalidPlatform &&
                    (walletAvailable ||
                        displayUnavailable === true ||
                        (Array.isArray(displayUnavailable) &&
                            displayUnavailable.length &&
                            displayUnavailable.includes(wallet.label)))

                if (supportedWallet) {
                    acc.push(
                        // modify wallet to display error if unavailable but displayUnavailable is set
                        (displayUnavailable === true ||
                            (Array.isArray(displayUnavailable) &&
                                displayUnavailable.length &&
                                displayUnavailable.includes(wallet.label))) &&
                        !walletAvailable
                            ? {
                                ...wallet,
                                getInterface: async () => {
                                    throw new Error(
                                        walletUnavailableMessage
                                            ? walletUnavailableMessage(wallet)
                                            : defaultWalletUnavailableMsg(wallet)
                                    )
                                }
                            }
                            : // otherwise add wallet to list as is
                            wallet
                    )
                }

                return acc
            },
            [] as InjectedWalletModule[]
        )

        if (wallets.length) {
            const moreThanOneWallet = wallets.length > 1

            // if more than one wallet, then remove detected wallet
            const formattedWallets = wallets
                .filter((wallet: InjectedWalletModule) => {
                    const { label } = wallet
                    return !(label === ProviderLabel.Detected && moreThanOneWallet)
                })
                // then map to the WalletModule interface
                .map(({ label, getIcon, getInterface, type }: InjectedWalletModule) => ({
                    label,
                    getIcon,
                    getInterface,
                    type
                }))
                // default sort by alphabetical
                .sort((a, b) =>
                    a.label < b.label ? -1 : a.label > b.label ? 1 : 0
                )

            return sort ? sort(formattedWallets) : formattedWallets
        }

        return []
    }
}

export default injected
