/* eslint-disable @typescript-eslint/no-floating-promises */
// Copyright 2019-2022 @subwallet/sub-connect authors & contributors
// SPDX-License-Identifier: Apache-2.0

// eslint-disable-next-line header/header
import { Button, ModalContext, SwList, Web3Block} from "@subwallet/react-ui";
import React, {useCallback, useContext, useEffect, useState} from 'react';
import type { Account } from '@subwallet-connect/core/dist/types';
import { useConnectWallet, useNotifications, useSetChain } from "@subwallet-connect/react";
import { SubstrateProvider } from "@subwallet-connect/common";
import { GeneralEmptyList } from "../empty";
import { ThemeProps } from "../../types";
import CN from "classnames";
import { evmApi } from "../../utils/api/evmApi";
import { substrateApi } from "../../utils/api/substrateApi";
import {toShort} from "../../utils/style";
import TransactionModal from "../transaction/TransactionModal";
import styled from "styled-components";
import {useNavigate} from "react-router-dom";
import {TRANSACTION_MODAL} from "../../constants/modal";
import SwAvatar from "@subwallet/react-ui/es/sw-avatar";
import {ScreenContext} from "../../context/ScreenContext";



interface Props extends ThemeProps{
  substrateProvider ?: substrateApi,
  evmProvider ?: evmApi,
};


type AccountMapType = {
  address: string,
  name: string,
  index: number
}


const modalId = TRANSACTION_MODAL;
function Component ({className, substrateProvider, evmProvider}: Props): React.ReactElement {
  const [{ wallet},] = useConnectWallet();
  const { isWebUI } = useContext(ScreenContext);
  const renderEmpty = useCallback(() => <GeneralEmptyList />, []);
  const [ accountsMap, setAccountMap ] = useState<AccountMapType[]>([])
  const navigate = useNavigate();
  const [ accountTransaction, setAccountTransaction ] = useState<Account>();
  const [{ chains }] = useSetChain();
  const [, customNotification, updateNotify,] = useNotifications();
  const { activeModal }  = useContext(ModalContext);


  const onSignClicked = useCallback(
     (address: string) => {
      return async () => {
        if(wallet){
          const { update, dismiss } = customNotification({
            type: 'pending',
            message:
              'Processing…',
            autoDismiss: 0
          });
          try {
            wallet.type === 'evm' ?  await evmProvider?.signMessage(address)
              : await substrateProvider?.signMessage(address, wallet.provider as SubstrateProvider, wallet.signer, wallet.chains[0].id);
            update({
              eventCode: 'dbUpdateSuccess',
              message: `Message signed successfully`,
              type: 'success',
              autoDismiss: 2000
            })
          }catch (e) {
            update({
              eventCode: 'dbUpdateError',
              message: `${(e as Error).message}`,
              type: 'error',
              autoDismiss: 2000
            })

          }

        }
      };
    },
    [ evmProvider, substrateProvider]
  );

  const onConvertToken = useCallback(
    (address: string) => {
      return async () => {
        if(wallet){
          const { update, dismiss } = customNotification({
            type: 'pending',
            message:
              'Processing…',
            autoDismiss: 0
          });
          try {
            const txHash = wallet.type === 'evm' ?  await evmProvider?.convertToken(address)
              : Promise.reject(new Error('Not implemented'));
            update({
              eventCode: 'dbUpdateSuccess',
              message: `Convert token successfully with txHash: ${txHash}`,
              type: 'success',
              autoDismiss: 2000
            })
          }catch (e) {
            update({
              eventCode: 'dbUpdateError',
              message: `${(e as Error).message}`,
              type: 'error',
              autoDismiss: 2000
            })

          }

        }
      };
    },
    [ evmProvider, substrateProvider]
  );

  const onTransactionClicked = useCallback(
    (address: string) => {
      return async () => {
        const account = wallet?.accounts.find(({address: address_}) => address === address_);
        setAccountTransaction(account)
        account && activeModal(modalId);
      };
    }, [activeModal, wallet])




  useEffect(() => {

    const accountMap = wallet?.accounts.reduce((acc, account, index)=>{
      acc.push({address: account.address, index, name: account.uns?.name || account.ens?.name || toShort(account.address)})
      return acc
    }, [] as AccountMapType[])

    setAccountMap(accountMap || []);
  }, [wallet?.accounts]);

  const accountItem = useCallback(({ address, name }: AccountMapType) => {
    const key = `${address}_${name}`
    const _middleItem = (
      <div className={'__account-item-middle'}>
        <div className={'__account-item-info'}>
          <span className='__account-item__title'>Wallet name:</span>
          <span className='__account-item__content'>
            <SwAvatar
              size={24}
              value={address}
            />
            <span className={'__account-item-name'}>
                   { name }
            </span>
          </span>
        </div>
        <div className={'__account-item-info'}>
          <span className='__account-item__title'>Address:</span>
          <span className='__account-item__content'>{address}</span>
        </div>
        <div className={'__account-item-info'}>
          <Button
            className={CN('__wallet-btn', '__sub-wallet-sign-btn')}
            onClick={onSignClicked(address)}
            block={true}
          >
            Sign Dummy
          </Button>

          <Button
            className={CN('__wallet-btn', '__sub-wallet-transaction-btn')}
            onClick={onTransactionClicked(address)}
            block={true}
          >
            Transaction
          </Button>
        </div>
        {
          wallet?.type === 'evm' && (
            <div className={'__account-item-info'}>
              <Button
                className={CN('__wallet-btn', '__sub-wallet-sign-btn')}
                onClick={onConvertToken(address)}
                block={true}
              >
                Swap USDC (Ithaca) to ETH (Sepolia)
              </Button>
            </div>
          )
        }
      </div>
    )

    return(
      <>
        <Web3Block
          key={key}
          className={'__account-item'}
          middleItem={_middleItem}
        />
      </>

    )
  }, [onSignClicked, onTransactionClicked])


  return (
    <>
      {
        accountsMap.length > 0 &&
        <>
            <SwList
                className={CN('__account-list', className, {
                  '-isWeb': isWebUI
                })}
                list={accountsMap}
                renderWhenEmpty={renderEmpty}
                renderItem={accountItem}
            />
          {
            accountTransaction && <TransactionModal senderAccount={accountTransaction} substrateProvider={substrateProvider} evmProvider={evmProvider} />
          }
        </>

    }
    </>

  );
}

export const AccountList = styled(Component)<Props>( ({theme: {token}}) => {
    return{

      '&.__account-list': {
        position: 'relative',
        width: '100%',
      },

      '&.-isWeb': {
        marginBottom: 200
      },

      '.__account-item': {
        padding: token.padding,
        width: '100%',
        marginBottom: token.marginSM,
        backgroundColor: token.colorBgSecondary,
        borderRadius: 8,
      },

      '.__account-item-middle': {
        display: 'flex',
        flexDirection: 'column',
        gap: token.paddingSM,
        overflow: 'hidden'
      },

      '.__account-item-info': {
        display: 'flex',
        justifyContent: 'space-between',
        width: '100%',
        overflow: 'hidden',
        gap: token.paddingSM
      },

      '.__account-item__title': {
        fontSize: token.fontSizeHeading6,
        fontStyle: 'normal',
        fontWeight: 600,
        width: 128,
        lineHeight: '22px',
        overflow: 'hidden'
      },


      '.__account-item__content': {
        display: 'flex',
        gap: token.paddingSM/2,
        alignItems: 'center',
        textOverflow: 'ellipsis',
        fontSize: token.fontSizeHeading6,
        overflow: 'hidden',
        fontStyle: 'normal',
        fontWeight: 500,
        lineHeight: '22px',
        color: token.colorTextLight4
      },

      '.__sub-wallet-transaction-btn': {
        backgroundColor: "#252525",

        '&:hover': {
          backgroundColor: "#363636"
        }
      },

    }
})

export default AccountList;
