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

    console.log('Wallet connected successfully')

  } catch (error) {
    console.error('Connection error:', error)
    statusEl.innerHTML = `❌ Connection failed.<br><small>Try Anchor Desktop/Mobile or My Cloud Wallet.</small>`
  }
}

walletBtn.addEventListener('click', connectWallet)

// ==================== REAL SMART CONTRACT FUNCTIONS ====================

// 1. CLAIM REWARDS from farms.waxdao
window.claimRewards = async function() {
  if (!session || !userAccount) return alert('Please connect wallet first')

  const farm = document.getElementById('farmSelect').value

  if (!confirm(`Claim rewards from farm: ${farm}?`)) return

  try {
    const result = await session.transact({
      actions: [{
        account: 'farms.waxdao',
        name: 'claim',
        authorization: [{ actor: userAccount, permission: 'active' }],
        data: {
          user: userAccount,
          farmname: farm
        }
      }]
    }, { blocksBehind: 3, expireSeconds: 30 })

    alert(`✅ Rewards claimed!\nTx: ${result.transaction_id}`)
  } catch (err) {
    alert('Claim failed: ' + (err.message || err))
  }
}

// 2. UNWRAP $SQUISH (Burn Wrapped NFT → get 69 $SQUISH)
window.unwrapSQUISH = async function() {
  if (!session || !userAccount) return alert('Please connect wallet first')

  if (!confirm('UNWRAP: Burn 1 Wrapped NFT → Receive 69 $SQUISH tokens?')) return

  try {
    const result = await session.transact({
      actions: [{
        account: 'waxdao',
        name: 'blend',
        authorization: [{ actor: userAccount, permission: 'active' }],
        data: {
          blend_id: 1775,        // Unwrap blend ID
          owner: userAccount
        }
      }]
    }, { blocksBehind: 3, expireSeconds: 30 })

    alert(`✅ Unwrap successful!\nTx: ${result.transaction_id}`)
  } catch (err) {
    alert('Unwrap failed: ' + (err.message || err))
  }
}

// 3. WRAP $SQUISH (69 $SQUISH + Diskette → Wrapped NFT)
window.wrapSQUISH = async function() {
  if (!session || !userAccount) return alert('Please connect wallet first')

  if (!confirm('WRAP: Send 69 $SQUISH + 1 Diskette NFT → Receive Wrapped NFT?')) return

  try {
    const result = await session.transact({
      actions: [{
        account: 'waxdao',
        name: 'blend',
        authorization: [{ actor: userAccount, permission: 'active' }],
        data: {
          blend_id: 1718,        // Wrap blend ID
          owner: userAccount
        }
      }]
    }, { blocksBehind: 3, expireSeconds: 30 })

    alert(`✅ Wrap successful!\nTx: ${result.transaction_id}`)
  } catch (err) {
    alert('Wrap failed: ' + (err.message || err))
  }
}

// 4. OPEN PACK (Neftyblocks packs)
window.openPack = async function() {
  if (!session || !userAccount) return alert('Please connect wallet first')

  const packId = document.getElementById('packInput').value.trim()
  if (!packId) return alert('Please enter a Pack Asset ID')

  if (!confirm(`Open Pack ID: ${packId}?`)) return

  try {
    const result = await session.transact({
      actions: [{
        account: 'neftyblocksp',
        name: 'open',
        authorization: [{ actor: userAccount, permission: 'active' }],
        data: {
          pack_id: parseInt(packId),
          owner: userAccount
        }
      }]
    }, { blocksBehind: 3, expireSeconds: 30 })

    alert(`✅ Pack opened successfully!\nTx: ${result.transaction_id}`)
  } catch (err) {
    alert('Open pack failed: ' + (err.message || err))
  }
}