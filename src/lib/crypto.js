export async function deriveSeed(password, email) {
    const enc = new TextEncoder();
    const passwordKey = await window.crypto.subtle.importKey(
        'raw',
        enc.encode(password),
        { name: 'PBKDF2' },
        false,
        ['deriveBits']
    );
    const salt = enc.encode(email);
    const derivedBits = await window.crypto.subtle.deriveBits(
        {
            name: 'PBKDF2',
            salt,
            iterations: 100000,
            hash: 'SHA-256'
        },
        passwordKey,
        512
    );
    return new Uint8Array(derivedBits);
}

export function generateKeyPair(seed) {
    const signSeed = seed.slice(0, 32);
    const encryptSeed = seed.slice(32, 64);
    return {
        sign: nacl.sign.keyPair.fromSeed(signSeed),
        encrypt: nacl.box.keyPair.fromSecretKey(encryptSeed)
    };
}

export function encryptMessage(plaintext, recipientEncPubKey, senderEncSecretKey) {
    const nonce = nacl.randomBytes(24);
    const msgBytes = new TextEncoder().encode(plaintext);
    const ciphertext = nacl.box(msgBytes, nonce, recipientEncPubKey, senderEncSecretKey);
    return { ciphertext, nonce };
}

export function decryptMessage(ciphertext, nonce, senderEncPubKey, recipientEncSecretKey) {
    const decryptedBytes = nacl.box.open(ciphertext, nonce, senderEncPubKey, recipientEncSecretKey);
    if (!decryptedBytes) return null;
    return new TextDecoder().decode(decryptedBytes);
}

export function signPayload(data, secretKey) {
    return nacl.sign.detached(data, secretKey);
}
