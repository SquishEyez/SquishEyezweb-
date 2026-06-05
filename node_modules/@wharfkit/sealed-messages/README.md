# Sealed Messages

Use [Shamir's secret sharing](https://en.wikipedia.org/wiki/Shamir%27s_secret_sharing) with [@wharfkit/antelope](https://github.com/wharfkit/antelope) Public/Private Keys to encrypt and decrypt a message.

In a real world scenario, the sender of the message needs to have a private key and known the public key of the receiver. They then take their message and a nonce to encode the message using the `sealMessage` function. The receiver needs to take the message and decrypt it with their private key, the public key of the sender, as well as the nonce of the message. 

As a full example below, we will use the following information.

```
Sender

Public: PUB_K1_7DcFftmP6xfsvuycjX9ZXU5fxoF9Dwft1K3Amymze5n5f6zj4W
Private: PVT_K1_2Uew3LyC8KRRXrnqiN4RmMP2nqR1tVY5gAjXMJkdtFVTthdRtJ

Receiver

Public: PUB_K1_5BSU51h332xWvhXYnu9TSvKQV3C9QDxS9XK1coq9m6zBnZwHKn
Private: PVT_K1_LzT8YiEeLKG82uYqYPjytVotkztTVgR9Xs9YFfRU1wQ7dtcED
```

Encrypt a message with a senders private key, the receivers public key, and a nonce.

```ts
const from = PrivateKey.from('PVT_K1_2Uew3LyC8KRRXrnqiN4RmMP2nqR1tVY5gAjXMJkdtFVTthdRtJ')
const to = PublicKey.from('PUB_K1_5BSU51h332xWvhXYnu9TSvKQV3C9QDxS9XK1coq9m6zBnZwHKn')
const nonce = UInt64.from(1234567890)
const message = 'Hello, World!'

const sealedMessage = await sealMessage(message, from, to, nonce)

console.log(String(sealedMessage))

// Output: abb3a412f59211df4d9d984d445127a9
```

The encrypted message can then be relayed to the receiver. The receiver can decrypt the message now using the their own private key, the senders public key, and the nonce.

```ts
const encrypted = 'abb3a412f59211df4d9d984d445127a9'
const sealedMessage = Bytes.from(encrypted, 'hex')
const from = PublicKey.from('PUB_K1_7DcFftmP6xfsvuycjX9ZXU5fxoF9Dwft1K3Amymze5n5f6zj4W')
const to = PrivateKey.from('PVT_K1_LzT8YiEeLKG82uYqYPjytVotkztTVgR9Xs9YFfRU1wQ7dtcED')
const nonce = UInt64.from(1234567890)

const unsealedMessage = await unsealMessage(sealedMessage, to, from, nonce)

console.log(unsealedMessage)
// Output: Hello, World!
```