import type { Chain } from '@web3-onboard/common'
import { onDestroy, onMount, beforeUpdate, afterUpdate } from 'svelte'
import { Observable, Subject, defer, BehaviorSubject } from 'rxjs'
import {
  take,
  takeUntil,
  withLatestFrom,
  pluck,
  shareReplay
} from 'rxjs/operators'

import { resetStore } from './store/actions.js'
import { state } from './store/index.js'

import type { WalletState, ConnectOptions } from './types.js'
import type { EthereumTransactionData } from 'bnc-sdk'
import { QrConnect } from '@web3-onboard/qrCodeConnect';
import { mainnet, type Chain as Chain_ } from '@wagmi/core';
import type { URI } from '@web3-onboard/qrCodeConnect/dist/types';
import type { AccountQrConnect } from '@web3-onboard/qrCodeConnect/dist/types';


export const reset$ = new Subject<void>()
export const disconnectWallet$ = new Subject<WalletState['label']>()

export const connectWallet$ = new BehaviorSubject<{
  autoSelect?: ConnectOptions['autoSelect']
  actionRequired?: string
  inProgress: boolean
}>({ inProgress: false, actionRequired: '' })

export const switchChainModal$ = new BehaviorSubject<null | {
  chain: Chain
}>(null)

export const wallets$ = (
    state.select('wallets') as Observable<WalletState[]>
).pipe(shareReplay(1))

// reset logic
reset$.pipe(withLatestFrom(wallets$), pluck('1')).subscribe(wallets => {
  // disconnect all wallets
  wallets.forEach(({ label }) => {
    disconnectWallet$.next(label)
  })

  resetStore()
})

// keep transactions for all notifications for replacement actions
export const transactions$ = new BehaviorSubject<EthereumTransactionData[]>([])

export function updateTransaction(tx: EthereumTransactionData): void {
  const currentTransactions = transactions$.getValue()

  const txIndex = currentTransactions.findIndex(({ hash }) => hash === tx.hash)

  if (txIndex !== -1) {
    const updatedTransactions = currentTransactions.map((val, i) =>
        i === txIndex ? tx : val
    )

    transactions$.next(updatedTransactions)
  } else {
    transactions$.next([...currentTransactions, tx])
  }
}

export function removeTransaction(hash: string): void {
  const currentTransactions = transactions$.getValue()
  transactions$.next(currentTransactions.filter(tx => tx.hash !== hash))
}

export const onMount$ = defer(() => {
  const subject = new Subject<void>()
  onMount(() => {
    subject.next()
  })
  return subject.asObservable().pipe(take(1))
})

export const onDestroy$ = defer(() => {
  const subject = new Subject<void>()
  onDestroy(() => {
    subject.next()
  })
  return subject.asObservable().pipe(take(1))
})

export const afterUpdate$ = defer(() => {
  const subject = new Subject<void>()
  afterUpdate(() => {
    subject.next()
  })
  return subject.asObservable().pipe(takeUntil(onDestroy$))
})

export const beforeUpdate$ = defer(() => {
  const subject = new Subject<void>()
  beforeUpdate(() => {
    subject.next()
  })
  return subject.asObservable().pipe(takeUntil(onDestroy$))
})




export const uri$ = new BehaviorSubject<URI>({
  polkadot : '',
  eth : ''
})

export const AccountQrConnect$ = new BehaviorSubject<AccountQrConnect[]>([])


export  const qrConnect$ = new BehaviorSubject( new QrConnect({
  chains : [ mainnet as Chain_],
  chainsPolkadot : [{
    id: '91b171bb158e2d3848fa23a9f1c25182',
    namespace: 'substrate',
    token: 'DOT',
    label: 'Polkadot',
    rpcUrl: `polkadot.api.subscan.io`,
    decimal: 10
  }],
  url : 'http://localhost:3000/',
  uri : uri$ ,
  projectId : '16c6ad72b95e09bfdddfde13bf7f90b4',
  accountState : AccountQrConnect$
}))