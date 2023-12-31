import React, { useEffect } from 'react'
import config from './config/config.json'
import abi from './config/abi.json'
import './css/App.css'

// Web3 Onboard
import { init, useConnectWallet } from '@web3-onboard/react'
import injectedModule from '@web3-onboard/injected-wallets'
import { ethers } from 'ethers'
import Onboard from '@web3-onboard/core'
import walletConnectModule from '@web3-onboard/walletconnect'
import ledgerModule from '@web3-onboard/ledger'
import dcentModule from '@web3-onboard/dcent'

const injected = injectedModule()

const walletConnect = walletConnectModule({
  bridge: 'https://bridge.walletconnect.org',
  qrcodeModalOptions: {
      mobileLinks: ['rainbow', 'metamask', 'argent', 'trust', 'imtoken', 'pillar']
  },
  connectFirstChainId: true
})

const ledger = ledgerModule()

const dcent = dcentModule()

// initialize Onboard
init({
  wallets: [injected, walletConnect, ledger, dcent],
  chains: [
    {
      id: config.CHAIN_ID,
      token: config.CHAIN_TOKEN_NAME,
      label: config.CHAIN_LABEL,
      rpcUrl: config.CHAIN_URI,
      // Adding the icon breaks the widget for some dumb reason
      //icon: flareIcon,
    }
  ],
  theme: 'system',
  notify: {
    desktop: {
      enabled: true,
      transactionHandler: transaction => {
        console.log({ transaction })
        if (transaction.eventCode === 'txPool') {
          return {
            type: 'success',
            message: 'Your transaction from #1 DApp is in the mempool',
          }
        }
      },
      position: 'bottomRight'
    },
    mobile: {
      enabled: true,
      transactionHandler: transaction => {
        console.log({ transaction })
        if (transaction.eventCode === 'txPool') {
          return {
            type: 'success',
            message: 'Your transaction from #1 DApp is in the mempool',
          }
        }
      },
      position: 'bottomRight'
    }
  },
  accountCenter: {
    desktop: {
      position: 'bottomRight',
      enabled: true,
      minimal: true
    },
    mobile: {
      position: 'bottomRight',
      enabled: true,
      minimal: true
    }
  },

})

export default function App() {
  const [{ wallet, connecting }, connect, disconnect] = useConnectWallet()
  const [contract, setContract] = React.useState(null)
  const [rewards, setRewards] = React.useState(0)
  const [totalSupply, setTotalSupply] = React.useState(0)

  // create an ethers provider
  let ethersProvider

  if (wallet) {
    // if using ethers v6 this is:
    // ethersProvider = new ethers.BrowserProvider(wallet.provider, 'any')
    ethersProvider = new ethers.providers.Web3Provider(wallet.provider, 'any')
  }

  const displayBigInt = (number, decimals = 4) => {
    if (number == 0) {
      return "0.0000"
    }
    if (Number(ethers.utils.formatEther(number)).toFixed(decimals) == 0) {
      return "<0.0001"
    }
    return Number(ethers.utils.formatEther(number)).toFixed(decimals)
  }

  const getContractData = async () => {
    try {
      if (!wallet) {
        console.log('Wallet not connected.')
        return
      }
      if (wallet.chains[0]['id'] !== config.CHAIN_ID) {
        throw new Error('Invalid chain.')
      }

      console.log('wallet', wallet.accounts[0]['address'])
      const provider = new ethers.providers.Web3Provider(window.ethereum)
      const signer = provider.getSigner()
      const contract = new ethers.Contract(config.ADDR_CONTRACT, abi, signer)
      if (!contract) {
        throw new Error('Failed to initialize contract.')
      }
      setContract(contract)
    } catch (error) { 
      console.log(error)
    }
  }

  useEffect(() => {
    getContractData()
  }, [wallet])

  useEffect(() => {
    displayRewards()
    displayTotalSupply()
  }, [contract])



  const displayRewards = async () => {
    try {
      if (!contract) {
        console.log('Contract not initialized.')
        setRewards("?")
      }
      const rewards = await contract.getClaimableAmount()
      console.log('rewards', rewards._hex)
      setRewards(displayBigInt(rewards._hex))
    } catch (error) {
      console.log(error)
      setRewards("?")
    }
  }

  const displayTotalSupply = async () => {
    try {
      if (!contract) {
        console.log('Contract not initialized.')
        setTotalSupply("?")
      }
      const totalSupply = await contract.totalSupply()
      console.log('totalSupply', totalSupply._hex)
      setTotalSupply(displayBigInt(totalSupply._hex, 0))
    } catch (error) {
      console.log(error)
      setTotalSupply("?")
    }
  }

  const claimRewards = async () => {
    try {
      if (!contract) {
        console.log('Contract not initialized.')
        return
      }
      const tx = await contract.claimReward()
      console.log('tx', tx)
      await tx.wait()
      displayRewards()
    } catch (error) {
      console.log(error)
    }
  }



  if(!wallet) {
   return (
    <main className="App">
      {wallet != null && wallet.chains[0]['id'] !== config.CHAIN_ID && (
        
        <p>
          
          Please switch to the {config.CHAIN_LABEL} network.
        </p>
      )}

      <h1>
        CGLD Rewards
      </h1>
      <h2>
        Simply connect your wallet to claim your holder rewards.
      </h2>
      <button className='neon-border btn' disabled={connecting} onClick={() => (wallet ? disconnect(wallet) : connect())}>
        {connecting ? 'Connecting' : wallet ? 'Disconnect' : 'Connect'}
      </button>

  </main>
   )
  }

  if(wallet != null && wallet.chains[0]['id'] !== config.CHAIN_ID ) {
    return (
      <main className="App">
        {wallet != null && wallet.chains[0]['id'] !== config.CHAIN_ID && (
          <h1>
            
            Please switch to the <b>{config.CHAIN_LABEL}</b> network.
          </h1>
        )}
    </main>
    )
  }

  return (
    <main className="App">
        {wallet != null && wallet.chains[0]['id'] !== config.CHAIN_ID && (
          
          <p>
            
            Please switch to the {config.CHAIN_LABEL} network.
          </p>
        )}

        <h1>
        Your rewards: <b>{rewards}</b>
        </h1>
        <h2>
        Rewards distributed: <b>{((200000000 - totalSupply)*2.33).toFixed(0)}</b> <br></br> Tokens burned: <b>{200000000 - totalSupply}</b> 
        </h2>
        <button className='neon-border btn' disabled={connecting} onClick={() => (wallet ? disconnect(wallet) : connect())}>
          {connecting ? 'Connecting' : wallet ? 'Disconnect' : 'Connect'}
        </button>
        <button className='neon-border btn' onClick={() => claimRewards()}>
          Claim Rewards
        </button>
    </main>
  );
}
