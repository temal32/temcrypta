/**
 * Generate an RSA key pair for secure communication
 * @returns {Promise<{publicKey: string, privateKey: string}>}
 */
async function generateKeyPair() {
    try {
        // Generate RSA key pair
        const keyPair = await window.crypto.subtle.generateKey(
            {
                name: "RSA-OAEP",
                modulusLength: 2048,
                publicExponent: new Uint8Array([1, 0, 1]),  // 65537
                hash: "SHA-256",
            },
            true,  // extractable
            ["encrypt", "decrypt"]  // usages
        );
        
        // Export public key as JWK
        const publicKeyJwk = await window.crypto.subtle.exportKey(
            "jwk",
            keyPair.publicKey
        );
        
        // Export private key as JWK
        const privateKeyJwk = await window.crypto.subtle.exportKey(
            "jwk",
            keyPair.privateKey
        );
        
        // Convert to strings for storage
        return {
            publicKey: JSON.stringify(publicKeyJwk),
            privateKey: JSON.stringify(privateKeyJwk)
        };
    } catch (error) {
        console.error("Error generating key pair:", error);
        throw error;
    }
}

/**
 * Import a public key from JWK format
 * @param {string} jwkString - Stringified JWK public key
 * @returns {Promise<CryptoKey>}
 */
async function importPublicKey(jwkString) {
    try {
        const jwk = JSON.parse(jwkString);
        return await window.crypto.subtle.importKey(
            "jwk",
            jwk,
            {
                name: "RSA-OAEP",
                hash: "SHA-256",
            },
            false,  // not extractable
            ["encrypt"]  // usage
        );
    } catch (error) {
        console.error("Error importing public key:", error);
        throw error;
    }
}

/**
 * Import a private key from JWK format
 * @param {string} jwkString - Stringified JWK private key
 * @returns {Promise<CryptoKey>}
 */
async function importPrivateKeyFromJWK(jwkString) {
    try {
        const jwk = JSON.parse(jwkString);
        return await window.crypto.subtle.importKey(
            "jwk",
            jwk,
            {
                name: "RSA-OAEP",
                hash: "SHA-256",
            },
            false,  // not extractable
            ["decrypt"]  // usage
        );
    } catch (error) {
        console.error("Error importing private key:", error);
        throw error;
    }
}

/**
 * Generate a random AES key for symmetric encryption
 * @returns {Promise<CryptoKey>}
 */
async function generateAESKey() {
    try {
        return await window.crypto.subtle.generateKey(
            {
                name: "AES-GCM",
                length: 256,
            },
            true,  // extractable
            ["encrypt", "decrypt"]
        );
    } catch (error) {
        console.error("Error generating AES key:", error);
        throw error;
    }
}

/**
 * Generate a random initialization vector
 * @returns {Uint8Array}
 */
function generateIV() {
    return window.crypto.getRandomValues(new Uint8Array(12));
}

/**
 * Convert an ArrayBuffer to a Base64 string
 * @param {ArrayBuffer} buffer
 * @returns {string}
 */
function arrayBufferToBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

/**
 * Convert a Base64 string to an ArrayBuffer
 * @param {string} base64
 * @returns {ArrayBuffer}
 */
function base64ToArrayBuffer(base64) {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
}

/**
 * Encrypt a message with AES-GCM
 * @param {string} message - Message to encrypt
 * @param {CryptoKey} key - AES key
 * @param {Uint8Array} iv - Initialization vector
 * @returns {Promise<ArrayBuffer>}
 */
async function encryptAES(message, key, iv) {
    try {
        const encoder = new TextEncoder();
        const data = encoder.encode(message);
        return await window.crypto.subtle.encrypt(
            {
                name: "AES-GCM",
                iv: iv,
                tagLength: 128,
            },
            key,
            data
        );
    } catch (error) {
        console.error("Error encrypting with AES:", error);
        throw error;
    }
}

/**
 * Decrypt a message with AES-GCM
 * @param {ArrayBuffer} encryptedData - Data to decrypt
 * @param {CryptoKey} key - AES key
 * @param {Uint8Array} iv - Initialization vector
 * @returns {Promise<string>}
 */
async function decryptAES(encryptedData, key, iv) {
    try {
        const decrypted = await window.crypto.subtle.decrypt(
            {
                name: "AES-GCM",
                iv: iv,
                tagLength: 128,
            },
            key,
            encryptedData
        );
        const decoder = new TextDecoder();
        return decoder.decode(decrypted);
    } catch (error) {
        console.error("Error decrypting with AES:", error);
        throw error;
    }
}

/**
 * Encrypt an AES key with RSA-OAEP
 * @param {CryptoKey} aesKey - AES key to encrypt
 * @param {CryptoKey} publicKey - RSA public key
 * @returns {Promise<ArrayBuffer>}
 */
async function encryptKey(aesKey, publicKey) {
    try {
        const exportedKey = await window.crypto.subtle.exportKey("raw", aesKey);
        return await window.crypto.subtle.encrypt(
            {
                name: "RSA-OAEP"
            },
            publicKey,
            exportedKey
        );
    } catch (error) {
        console.error("Error encrypting key:", error);
        throw error;
    }
}

/**
 * Decrypt an AES key with RSA-OAEP
 * @param {ArrayBuffer} encryptedKey - Encrypted AES key
 * @param {CryptoKey} privateKey - RSA private key
 * @returns {Promise<CryptoKey>}
 */
async function decryptKey(encryptedKey, privateKey) {
    try {
        const decryptedKeyBuffer = await window.crypto.subtle.decrypt(
            {
                name: "RSA-OAEP"
            },
            privateKey,
            encryptedKey
        );
        
        return await window.crypto.subtle.importKey(
            "raw",
            decryptedKeyBuffer,
            {
                name: "AES-GCM",
                length: 256,
            },
            true,
            ["encrypt", "decrypt"]
        );
    } catch (error) {
        console.error("Error decrypting key:", error);
        throw error;
    }
}