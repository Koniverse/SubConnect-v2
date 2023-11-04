import {BlockchainApiIdentityRequest, BlockchainApiIdentityResponse, CaipNetworkId} from "./types.js";
import { ConstantsUtil } from "./constants.js";

export function caipNetworkIdToNumber(caipnetworkId?: CaipNetworkId) {
    return caipnetworkId ?caipnetworkId.split(':')[1] : '0'
}
// -- Types ----------------------------------------------------------------------
interface Options {
    baseUrl: string
}

interface RequestArguments {
    path: string
    headers?: HeadersInit
    params?: Record<string, string | undefined>
}

interface PostArguments extends RequestArguments {
    body?: Record<string, unknown>
}

// -- Utility --------------------------------------------------------------------
export class FetchUtil {
    public baseUrl: Options['baseUrl']

    public constructor({ baseUrl }: Options) {
        this.baseUrl = baseUrl
    }

    public async get<T>({ headers, ...args }: RequestArguments) {
        const url = this.createUrl(args)
        const response = await fetch(url, { method: 'GET', headers })

        return response.json() as T
    }

    public async getBlob({ headers, ...args }: RequestArguments) {
        const url = this.createUrl(args)
        const response = await fetch(url, { method: 'GET', headers })

        return response.blob()
    }

    public async post<T>({ body, headers, ...args }: PostArguments) {
        const url = this.createUrl(args)
        const response = await fetch(url, {
            method: 'POST',
            headers,
            body: body ? JSON.stringify(body) : undefined
        })

        return response.json() as T
    }

    public async put<T>({ body, headers, ...args }: PostArguments) {
        const url = this.createUrl(args)
        const response = await fetch(url, {
            method: 'PUT',
            headers,
            body: body ? JSON.stringify(body) : undefined
        })

        return response.json() as T
    }

    public async delete<T>({ body, headers, ...args }: PostArguments) {
        const url = this.createUrl(args)
        const response = await fetch(url, {
            method: 'DELETE',
            headers,
            body: body ? JSON.stringify(body) : undefined
        })

        return response.json() as T
    }

    private createUrl({ path, params }: RequestArguments) {
        const url = new URL(path, this.baseUrl)
        if (params) {
            Object.entries(params).forEach(([key, value]) => {
                if (value) {
                    url.searchParams.append(key, value)
                }
            })
        }

        return url
    }
}

export  function isRestrictedRegion  () {
    try {
        const {timeZone} = new Intl.DateTimeFormat().resolvedOptions()
        const capTimeZone = timeZone.toUpperCase()

        return ConstantsUtil.RESTRICTED_TIMEZONES.includes(capTimeZone)
    } catch {
        return false
    }
}

export function getBlockchainApiUrl  () {
    return isRestrictedRegion()
        ? 'https://rpc.walletconnect.org'
        : 'https://rpc.walletconnect.com'
}


const baseUrl = getBlockchainApiUrl()
const api = new FetchUtil({ baseUrl })


export function fetchIdentity({ caipChainId, address }: BlockchainApiIdentityRequest, projectId : string) {
        return api.get<BlockchainApiIdentityResponse>({
            path: `/v1/identity/${address}`,
            params: {
                chainId: caipChainId,
                projectId
            }
        })
    }
