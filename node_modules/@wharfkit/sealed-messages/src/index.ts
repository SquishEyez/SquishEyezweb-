import {
    Bytes,
    Checksum256,
    Checksum512,
    PrivateKey,
    PublicKey,
    Serializer,
    Struct,
    UInt32,
    UInt64,
} from '@wharfkit/antelope'
import {AES_CBC} from '@greymass/miniaes'

@Struct.type('sealed_message')
export class SealedMessage extends Struct {
    @Struct.field('public_key') from!: PublicKey
    @Struct.field('uint64') nonce!: UInt64
    @Struct.field('bytes') ciphertext!: Bytes
    @Struct.field('uint32') checksum!: UInt32
}

export function createSymmetricKey(secret: Checksum512, nonce: UInt64): Uint8Array {
    const key = Checksum512.hash(Serializer.encode({object: nonce}).appending(secret.array))
    return key.array.slice(0, 32)
}

export function createIV(nonce: UInt64, secret: Checksum512): Checksum512 {
    return Checksum512.hash(Serializer.encode({object: nonce}).appending(secret.array))
}

export function encryptMessage(iv: Checksum512, symmetricKey: Uint8Array, message: string): Bytes {
    const plaintext = Bytes.from(message, 'utf8').array
    const ivBytes = iv.array.slice(32, 48)
    const encrypted = AES_CBC.encrypt(plaintext, symmetricKey, true, ivBytes)
    return Bytes.from(encrypted)
}

export function decryptMessage(
    iv: Checksum512,
    symmetricKey: Uint8Array,
    message: Bytes
): Uint8Array {
    const ivBytes = iv.array.slice(32, 48)
    return AES_CBC.decrypt(message.array, symmetricKey, true, ivBytes)
}

/**
 * Seals a message using AES encryption and a shared secret derived from given keys.
 * @param message - The message to seal
 * @param privateKey - The private key to use for encryption
 * @param publicKey - The public key to use for encryption
 * @param nonce - A nonce to use for encryption
 * @returns The sealed message as Bytes
 */
export function sealMessage(
    message: string,
    privateKey: PrivateKey,
    publicKey: PublicKey,
    nonce: UInt64
): Bytes {
    const secret = privateKey.sharedSecret(publicKey)
    const iv = createIV(nonce, secret)
    const symmetricKey = createSymmetricKey(secret, nonce)
    return encryptMessage(iv, symmetricKey, message)
}

export function sealedMessagePayload(
    message: string,
    privateKey: PrivateKey,
    publicKey: PublicKey,
    nonce?: UInt64
): SealedMessage {
    if (!nonce) {
        nonce = UInt64.random()
    }
    const secret = privateKey.sharedSecret(publicKey)
    const iv = createIV(nonce, secret)
    const symmetricKey = createSymmetricKey(secret, nonce)
    const ciphertext = encryptMessage(iv, symmetricKey, message)
    const checksumView = new DataView(Checksum256.hash(iv.array).array.buffer)
    const checksum = checksumView.getUint32(0, true)
    return new SealedMessage({
        from: privateKey.toPublic(),
        nonce,
        ciphertext,
        checksum,
    })
}

/**
 * Decrypt a message using AES and shared secret derived from given keys.
 * @param message - The encrypted message bytes to decrypt
 * @param privateKey - The private key to use for deriving the shared secret
 * @param publicKey - The public key to use for deriving the shared secret
 * @param nonce - The nonce used in the encryption process
 * @returns The decrypted message as a UTF-8 string
 * @internal
 */
export function unsealMessage(
    message: Bytes,
    privateKey: PrivateKey,
    publicKey: PublicKey,
    nonce: UInt64
): string {
    const secret = privateKey.sharedSecret(publicKey)
    const iv = createIV(nonce, secret)
    const symmetricKey = createSymmetricKey(secret, nonce)
    const decryptedMessage = decryptMessage(iv, symmetricKey, message)
    return Bytes.from(decryptedMessage).toString('utf8')
}
