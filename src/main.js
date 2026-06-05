import { Session } from '@wharfkit/session'
import { WalletPluginAnchor } from '@wharfkit/wallet-plugin-anchor'
import { WalletPluginCloudWallet } from '@wharfkit/wallet-plugin-cloudwallet'

let session = null
let userAccount = null

const walletBtn = document.getElementById('connectWallet')
const statusEl = document.getElementById('wallet-status')

async function connectWallet() {
  statusEl.innerHTML = 'Connecting... Please approve in your wallet app.'

  try {
    const anchorPlugin = new WalletPluginAnchor()
    const cloudWalletPlugin = new WalletPluginCloudWallet()

    session = new Session({
      chain: {
        id: '1064487b3cd1a89790cf1a7c0c8d9e9f4d9f9f4d9f9f4d9f9f4d9f9f4d9f9f4d', // WAX Mainnet
        url: 'https://wax.greymass.com'
      },
      walletPlugins: [anchorPlugin, cloudWalletPlugin]
    })

    const result = await session.login()
    userAccount = result.account

    statusEl.innerHTML = `✅ CONNECTED: <strong>${userAccount}</strong>`
    statusEl.style.color = '#00ff9d'
    walletBtn.textContent = `✅ ${userAccount}`

    console.log('Wallet connected successfully via WharfKit')

  } catch (error) {
    console.error('Connection error:', error)
    statusEl.innerHTML = `❌ Connection failed.<br><small>Make sure Anchor Desktop/Mobile is running and try again.<br>Or use My Cloud Wallet.</small>`
  }
}

walletBtn.addEventListener('click', connectWallet)

// Placeholder functions (we'll upgrade these next)
window.claimRewards = async function() {
  if (!userAccount) return alert('Please connect wallet first')
  alert('Claim function ready. Real farms.waxdao call coming next.')
}

window.unwrapSQUISH = async function() {
  if (!userAccount) return alert('Please connect wallet first')
  alert('Unwrap function ready. Real blend call coming next.')
}

window.wrapSQUISH = async function() {
  if (!userAccount) return alert('Please connect wallet first')
  alert('Wrap function ready. Real blend call coming next.')
}

window.openPack = async function() {
  if (!userAccount) return alert('Please connect wallet first')
  const packId = document.getElementById('packInput').value.trim()
  if (!packId) return alert('Please enter a Pack Asset ID')
  alert(`Open Pack ${packId} function ready. Real neftyblocksp call coming next.`)
}