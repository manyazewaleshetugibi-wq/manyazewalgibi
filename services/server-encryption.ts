// lib/server-encryption.ts
import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const SALT_LENGTH = 64;
const KEY_LENGTH = 32;
const ITERATIONS = 100000;

// Server-side encryption
export async function encryptData(data: any, password: string = process.env.ENCRYPTION_KEY || 'default-server-key'): Promise<string> {
    try {
        // Generate a random salt
        const salt = crypto.randomBytes(SALT_LENGTH);
        
        // Derive key using PBKDF2
        const key = crypto.pbkdf2Sync(password, salt, ITERATIONS, KEY_LENGTH, 'sha256');
        
        // Generate random IV
        const iv = crypto.randomBytes(IV_LENGTH);
        
        // Create cipher
        const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
        
        // Encrypt the data
        const encrypted = Buffer.concat([
            cipher.update(JSON.stringify(data), 'utf8'),
            cipher.final()
        ]);
        
        // Get auth tag
        const authTag = cipher.getAuthTag();
        
        // Combine salt + iv + authTag + encrypted data
        const combined = Buffer.concat([
            salt,
            iv,
            authTag,
            encrypted
        ]);
        
        return combined.toString('base64');
    } catch (error) {
        console.error('Encryption error:', error);
        // Fallback: base64 encode
        return Buffer.from(JSON.stringify(data)).toString('base64');
    }
}

export async function decryptData(encryptedData: string, password: string = process.env.ENCRYPTION_KEY || 'default-server-key'): Promise<any> {
    try {
        const combined = Buffer.from(encryptedData, 'base64');
        
        // Extract components
        const salt = combined.slice(0, SALT_LENGTH);
        const iv = combined.slice(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
        const authTag = combined.slice(SALT_LENGTH + IV_LENGTH, SALT_LENGTH + IV_LENGTH + 16);
        const encrypted = combined.slice(SALT_LENGTH + IV_LENGTH + 16);
        
        // Derive key
        const key = crypto.pbkdf2Sync(password, salt, ITERATIONS, KEY_LENGTH, 'sha256');
        
        // Create decipher
        const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
        decipher.setAuthTag(authTag);
        
        // Decrypt
        const decrypted = Buffer.concat([
            decipher.update(encrypted),
            decipher.final()
        ]);
        
        return JSON.parse(decrypted.toString('utf8'));
    } catch (error) {
        console.error('Decryption error:', error);
        // Try to parse as base64 JSON
        try {
            return JSON.parse(Buffer.from(encryptedData, 'base64').toString('utf8'));
        } catch {
            return null;
        }
    }
}