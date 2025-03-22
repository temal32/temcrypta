/**
 * Mobile Messenger App
 * Crypto utilities (extending crypto.js)
 */

/**
 * Import a public key in PEM format
 * @param {string} pemString - PEM formatted public key
 * @returns {Promise<CryptoKey>}
 */
async function importPublicKeyFromPEM(pemString) {
    try {
        // Strip PEM header and footer and decode base64
        const pemContents = pemString
            .replace('-----BEGIN PUBLIC KEY-----', '')
            .replace('-----END PUBLIC KEY-----', '')
            .replace(/\n/g, '');
        
        const binaryDer = base64ToArrayBuffer(pemContents);
        
        return await window.crypto.subtle.importKey(
            "spki",
            binaryDer,
            {
                name: "RSA-OAEP",
                hash: "SHA-256",
            },
            false,
            ["encrypt"]
        );
    } catch (error) {
        console.error("Error importing public key from PEM:", error);
        throw error;
    }
}

/**
 * Import a private key in PEM format
 * @param {string} pemString - PEM formatted private key
 * @returns {Promise<CryptoKey>}
 */
async function importPrivateKeyFromPEM(pemString) {
    try {
        // Strip PEM header and footer and decode base64
        const pemContents = pemString
            .replace('-----BEGIN PRIVATE KEY-----', '')
            .replace('-----END PRIVATE KEY-----', '')
            .replace(/\n/g, '');
        
        const binaryDer = base64ToArrayBuffer(pemContents);
        
        return await window.crypto.subtle.importKey(
            "pkcs8",
            binaryDer,
            {
                name: "RSA-OAEP",
                hash: "SHA-256",
            },
            false,
            ["decrypt"]
        );
    } catch (error) {
        console.error("Error importing private key from PEM:", error);
        throw error;
    }
}

/**
 * Export a public key to PEM format
 * @param {CryptoKey} publicKey - The public key to export
 * @returns {Promise<string>} - PEM formatted key
 */
async function exportPublicKeyToPEM(publicKey) {
    try {
        const exported = await window.crypto.subtle.exportKey("spki", publicKey);
        const exportedAsBase64 = arrayBufferToBase64(exported);
        const pemExported = `-----BEGIN PUBLIC KEY-----\n${
            exportedAsBase64.match(/.{1,64}/g).join('\n')
        }\n-----END PUBLIC KEY-----`;
        
        return pemExported;
    } catch (error) {
        console.error("Error exporting public key to PEM:", error);
        throw error;
    }
}

/**
 * Export a private key to PEM format
 * @param {CryptoKey} privateKey - The private key to export
 * @returns {Promise<string>} - PEM formatted key
 */
async function exportPrivateKeyToPEM(privateKey) {
    try {
        const exported = await window.crypto.subtle.exportKey("pkcs8", privateKey);
        const exportedAsBase64 = arrayBufferToBase64(exported);
        const pemExported = `-----BEGIN PRIVATE KEY-----\n${
            exportedAsBase64.match(/.{1,64}/g).join('\n')
        }\n-----END PRIVATE KEY-----`;
        
        return pemExported;
    } catch (error) {
        console.error("Error exporting private key to PEM:", error);
        throw error;
    }
}

/**
 * Generates a new RSA key pair and updates both local storage and server
 * @returns {Promise<{publicKey: string, privateKey: string}>}
 */
async function generateAndSaveKeyPair() {
    try {
        // Generate key pair
        const keyPair = await generateKeyPair();
        
        // Store private key in browser local storage
        localStorage.setItem('privateKey', keyPair.privateKey);
        
        // Send public key to server
        const response = await fetch('../api/update_public_key.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                public_key: keyPair.publicKey
            })
        });
        
        const data = await response.json();
        if (data.error) {
            throw new Error(data.error);
        }
        
        return keyPair;
    } catch (error) {
        console.error("Error generating and saving key pair:", error);
        throw error;
    }
}

/**
 * Hash a string using SHA-256
 * @param {string} message - String to hash
 * @returns {Promise<string>} - Hex encoded hash
 */
async function sha256Hash(message) {
    try {
        const encoder = new TextEncoder();
        const data = encoder.encode(message);
        const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        return hashHex;
    } catch (error) {
        console.error("Error hashing message:", error);
        throw error;
    }
}

/**
 * Create a digital signature for a message
 * @param {string} message - Message to sign
 * @param {CryptoKey} privateKey - RSA private key
 * @returns {Promise<string>} - Base64 encoded signature
 */
async function signMessage(message, privateKey) {
    try {
        const encoder = new TextEncoder();
        const data = encoder.encode(message);
        
        const signature = await window.crypto.subtle.sign(
            {
                name: "RSA-PSS",
                saltLength: 32,
            },
            privateKey,
            data
        );
        
        return arrayBufferToBase64(signature);
    } catch (error) {
        console.error("Error signing message:", error);
        throw error;
    }
}

/**
 * Verify a digital signature
 * @param {string} message - Original message
 * @param {string} signature - Base64 encoded signature
 * @param {CryptoKey} publicKey - RSA public key
 * @returns {Promise<boolean>} - Whether the signature is valid
 */
async function verifySignature(message, signature, publicKey) {
    try {
        const encoder = new TextEncoder();
        const data = encoder.encode(message);
        const signatureBuffer = base64ToArrayBuffer(signature);
        
        const isValid = await window.crypto.subtle.verify(
            {
                name: "RSA-PSS",
                saltLength: 32,
            },
            publicKey,
            signatureBuffer,
            data
        );
        
        return isValid;
    } catch (error) {
        console.error("Error verifying signature:", error);
        return false;
    }
}