
import { arbitrum, arbitrumGoerli, arbitrumNova, aurora, mainnet, type Chain } from '@wagmi/chains';


export  const listWagmiNetwork : { [key: string]: Chain } = {
    '1' : mainnet,
    '42161' : arbitrum,
    '421613': arbitrumGoerli,
    '42170' : arbitrumNova,
    '1313161554' :aurora
}