import { Session } from '@wharfkit/session'
import { WalletPluginAnchor } from '@wharfkit/wallet-plugin-anchor'
import { WalletPluginCloudWallet } from '@wharfkit/wallet-plugin-cloudwallet'

// Correct WAX Mainnet chain ID
const WAX_CHAIN = {
  id: '1064487b3cd1a897ce03ae5b6a865651747e2e152090f99c1d19d44e01aea5a4',
  url: 'https://wax.greymass.com'
}

let session = null
let userAccount = null

const walletBtn = document.getElementById('connectWallet')
const statusEl = document.getElementById('wallet-status')

function showError(message) {
  console.error(message)
  statusEl.innerHTML = `❌ ERROR: ${message}<br><small>Check console for more details</small>`
  statusEl.style.color = '#ff5555'
  statusEl.style.borderColor = '#ff5555'
}

function updateStatus(html, color = '#00ff9d') {
  statusEl.innerHTML = html
  statusEl.style.color = color
  statusEl.style.borderColor = color
}

async function connectWallet() {
  console.log('Connect button clicked')
  updateStatus('Connecting... Please check your wallet app.', '#aaffcc')

  try {
    const anchorPlugin = new WalletPluginAnchor()
    const cloudWalletPlugin = new WalletPluginCloudWallet()

    session = new Session({
      chain: WAX_CHAIN,
      walletPlugins: [anchorPlugin, cloudWalletPlugin]
    })

    const result = await session.login()
    userAccount = result.account.toString()

    updateStatus(`✅ CONNECTED: <strong>${userAccount}</strong>`)
    walletBtn.textContent = `✅ ${userAccount} (click to disconnect)`
    walletBtn.onclick = disconnectWallet

  } catch (error) {
    console.error('Connection error:', error)
    showError(error.message || 'Unknown error during connection')
  }
}

async function disconnectWallet() {
  session = null
  userAccount = null
  updateStatus('Wallet not connected')
  walletBtn.textContent = 'CONNECT WALLET'
  walletBtn.onclick = connectWallet
}

walletBtn.addEventListener('click', connectWallet)

// Helper to sign a transaction
async function signAndBroadcast(actions) {
  if (!session || !userAccount) {
    showError('Wallet not connected')
    return null
  }

  try {
    updateStatus('Signing transaction... Check your wallet.', '#aaffcc')
    const result = await session.transact({ actions })
    updateStatus(`✅ TX submitted: ${result.response?.transaction_id || 'success'}`)
    return result
  } catch (error) {
    showError(error.message || 'Transaction failed')
    return null
  }
}

// ==================== SMART CONTRACT FUNCTIONS ====================

window.claimRewards = async function() {
  const farmSelect = document.getElementById('farmSelect')
  const farmName = farmSelect ? farmSelect.value : 'squish.bat'

  // WaxDAO NFT/token farms typically use farms.waxdao::claim
  // Adjust contract/action if your farms use a different contract
  const actions = [{
    account: 'farms.waxdao',
    name: 'claim',
    authorization: [{ actor: userAccount, permission: 'active' }],
    data: {
      user: userAccount,
      farmname: farmName
    }
  }]

  await signAndBroadcast(actions)
}

window.unwrapSQUISH = async function() {
  // Placeholder for WAXDAO blend unwrap (burn wrapped NFT → 69 $SQUISH)
  // Replace with actual blend action once you know the blend ID / contract details
  showError('Unwrap: Configure the correct WAXDAO blend action (see waxdao.io/blends)')
}

window.wrapSQUISH = async function() {
  // Placeholder for wrap (69 $SQUISH + Diskette → Wrapped NFT)
  showError('Wrap: Configure the correct blend/mint action')
}

window.openPack = async function() {
  const packIdInput = document.getElementById('packInput')
  const packId = packIdInput ? packIdInput.value.trim() : ''

  if (!packId || isNaN(packId)) {
    showError('Please enter a valid Pack NFT Asset ID')
    return
  }

  // Standard AtomicPacks open flow:
  // 1. Transfer pack NFT to atomicpacksx with memo "unbox"
  // 2. Later call claimunboxed (may need separate button or follow-up)
  const actions = [{
    account: 'atomicassets',
    name: 'transfer',
    authorization: [{ actor: userAccount, permission: 'active' }],
    data: {
      from: userAccount,
      to: 'atomicpacksx',
      asset_ids: [packId],
      memo: 'unbox'
    }
  }]

  await signAndBroadcast(actions)
  updateStatus('Pack transfer submitted. After RNG resolves, call claimunboxed if needed.', '#aaffcc')
}