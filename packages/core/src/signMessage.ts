import type { WalletState } from './types';
import {
    signDummy,
    signEthSignMessageRequest,
    signPersonalSignMessageRequest,
    signTypedData_v4MessageRequest,
    signTypedDataMessageRequest
} from './provider';
import { sendSignMessage } from './store/actions';
import type { EIP1193Provider } from '@web3-onboard/common';


async function signMessageAllTypeWallet (
    wallet : WalletState,
    signMethodType : string,
) {
    let message : string;
    try {
        if (wallet.type === 'evm') {
            if (signMethodType === 'ETH Sign') {
                message = await signEthSignMessageRequest(
                    wallet.provider as EIP1193Provider
                );
            } else if (signMethodType === 'Personal Sign') {
                console.log('pass')
                message = await signPersonalSignMessageRequest(
                    wallet.provider as EIP1193Provider
                );
            } else if (signMethodType === 'Sign Typed Data') {
                message = await signTypedDataMessageRequest(
                    wallet.provider as EIP1193Provider
                );
            } else if (signMethodType === 'Sign Typed Data v4') {
                message = await signTypedData_v4MessageRequest(
                    wallet.provider as EIP1193Provider
                )
            }
            sendSignMessage(message)
        }else if( wallet.type === 'substrate' && signMethodType === 'signMessageForSubstrateWallet') {
            message = (await signDummy( wallet )).signature;
        }
    } catch (e) {
        console.log((e as Error).message)
    }
}

export default signMessageAllTypeWallet