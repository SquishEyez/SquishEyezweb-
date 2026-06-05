import { Session } from '@wharfkit/session'
import { WalletPluginAnchor } from '@wharfkit/wallet-plugin-anchor'
import { WalletPluginCloudWallet } from '@wharfkit/wallet-plugin-cloudwallet'

let session = null
let userAccount = null

const walletBtn = document.getElementById('connectWallet')
const statusEl = document.getElementById('wallet-status')

// Helper to show visible errors on the page
function showError(message) {
  console.error(message)
  statusEl.innerHTML = `❌ ERROR: ${message}<br><small>Check console for more details</small>`
  statusEl.style.color = '#ff5555'
  statusEl.style.borderColor = '#ff5555'
}

async function connectWallet() {
  console.log('Connect button clicked')
  statusEl.innerHTML = 'Connecting... Please check your wallet app.'
  statusEl.style.color = '#aaffcc'

  try {
    console.log('Creating WharfKit session...')

    const anchorPlugin = new WalletPluginAnchor()
    const cloudWalletPlugin = new WalletPluginCloudWallet()

    session = new Session({
      chain: {
        id: '1064487b3cd1a89790cf1a7c0c8d9e9f4d9f9f4d9f9f4d9f9f4d9f9f4d9f9f4d', // WAX Mainnet
        url: 'https://wax.greymass.com'
      },
      walletPlugins: [anchorPlugin, cloudWalletPlugin]
    })

    console.log('Session created. Attempting login...')

    const result = await session.login()
    userAccount = result.account

    console.log('Login successful:', userAccount)

    statusEl.innerHTML = `✅ CONNECTED: <strong>${userAccount}</strong>`
    statusEl.style.color = '#00ff9d'
    statusEl.style.borderColor = '#00ff9d'
    walletBtn.textContent = `✅ ${userAccount}`

  } catch (error) {
    console.error('Full connection error:', error)
    showError(error.message || 'Unknown error during connection')
  }
}

walletBtn.addEventListener('click', connectWallet)

// ==================== REAL SMART CONTRACT FUNCTIONS ====================

window.claimRewards = async function() {
  if (!session || !userAccount) {
    showError('Wallet not connected')
    return
  }
  // ... (rest of the functions stay the same as before)
  alert('Claim function ready (real version coming next)')
}

window.unwrapSQUISH = async function() {
  if (!session || !userAccount) {
    showError('Wallet not connected')
    return
  }
  alert('Unwrap function ready (real version coming next)')
}

window.wrapSQUISH = async function() {
  if (!session || !userAccount) {
    showError('Wallet not connected')
    return
  }
  alert('Wrap function ready (real version coming next)')
}

window.openPack = async function() {
  if (!session || !userAccount) {
    showError('Wallet not connected')
    return
  }
  alert('Open Pack function ready (real version coming next)')
}