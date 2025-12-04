/**
 * Secure storage using IndexedDB with Web Crypto API encryption
 * Works offline and in service workers (PWA-ready)
 * No external dependencies - uses native browser APIs
 */

import logger from './logger';

const DB_NAME = 'rc_secure_storage';
const DB_VERSION = 1;
const STORE_NAME = 'auth_data';

// Generate encryption key from device ID
const getEncryptionKey = async (): Promise<CryptoKey> => {
    let deviceId = localStorage.getItem('device_id');
    if (!deviceId) {
        deviceId = `${Date.now()}_${Math.random().toString(36)}`;
        localStorage.setItem('device_id', deviceId);
    }

    // Convert device ID to key material
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
        'raw',
        encoder.encode(deviceId.padEnd(32, '0').slice(0, 32)), // Ensure 32 bytes
        { name: 'PBKDF2' },
        false,
        ['deriveBits', 'deriveKey']
    );

    // Derive AES key
    return crypto.subtle.deriveKey(
        {
            name: 'PBKDF2',
            salt: encoder.encode('rc-auth-salt-v1'),
            iterations: 100000,
            hash: 'SHA-256',
        },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt']
    );
};

// Encrypt data using Web Crypto API
const encrypt = async (data: string): Promise<string> => {
    const key = await getEncryptionKey();
    const encoder = new TextEncoder();
    const iv = crypto.getRandomValues(new Uint8Array(12)); // 96-bit IV for AES-GCM

    const encrypted = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        key,
        encoder.encode(data)
    );

    // Combine IV + encrypted data and convert to base64
    const combined = new Uint8Array(iv.length + encrypted.byteLength);
    combined.set(iv, 0);
    combined.set(new Uint8Array(encrypted), iv.length);

    return btoa(String.fromCharCode(...combined));
};

// Decrypt data using Web Crypto API
const decrypt = async (encryptedData: string): Promise<string> => {
    const key = await getEncryptionKey();

    // Convert from base64
    const combined = Uint8Array.from(atob(encryptedData), c => c.charCodeAt(0));

    // Extract IV and encrypted data
    const iv = combined.slice(0, 12);
    const encrypted = combined.slice(12);

    const decrypted = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        key,
        encrypted
    );

    const decoder = new TextDecoder();
    return decoder.decode(decrypted);
};

class SecureStorage {
    private db: IDBDatabase | null = null;

    async init(): Promise<void> {
        if (this.db) return;

        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onerror = () => {
                logger.error('Failed to open IndexedDB', request.error);
                reject(request.error);
            };

            request.onsuccess = () => {
                this.db = request.result;
                logger.debug('IndexedDB initialized');
                resolve();
            };

            request.onupgradeneeded = (event: any) => {
                const db = event.target.result;

                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    const store = db.createObjectStore(STORE_NAME, { keyPath: 'key' });
                    store.createIndex('expiresAt', 'expiresAt', { unique: false });
                    logger.debug('IndexedDB store created');
                }
            };
        });
    }

    async set(key: string, value: any, expiresAt?: number): Promise<void> {
        await this.init();
        if (!this.db) throw new Error('DB not initialized');

        try {
            const encrypted = await encrypt(JSON.stringify(value));

            return new Promise((resolve, reject) => {
                const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
                const store = transaction.objectStore(STORE_NAME);

                const request = store.put({
                    key,
                    value: encrypted,
                    expiresAt: expiresAt || null,
                    createdAt: Date.now()
                });

                request.onsuccess = () => {
                    logger.debug('Stored encrypted data', { key, hasExpiry: !!expiresAt });
                    resolve();
                };
                request.onerror = () => {
                    logger.error('Failed to store data', request.error);
                    reject(request.error);
                };
            });
        } catch (error) {
            logger.error('Encryption failed', error);
            throw error;
        }
    }

    async get(key: string): Promise<any | null> {
        await this.init();
        if (!this.db) throw new Error('DB not initialized');

        return new Promise((resolve, reject) => {
            const transaction = this.db!.transaction([STORE_NAME], 'readonly');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.get(key);

            request.onsuccess = async () => {
                const result = request.result;
                if (!result) {
                    resolve(null);
                    return;
                }

                // Check expiration
                if (result.expiresAt && Date.now() > result.expiresAt) {
                    logger.debug('Data expired, auto-cleanup', { key });
                    this.delete(key); // Auto-cleanup expired
                    resolve(null);
                    return;
                }

                try {
                    const decrypted = await decrypt(result.value);
                    const parsed = JSON.parse(decrypted);
                    logger.debug('Retrieved encrypted data', { key });
                    resolve(parsed);
                } catch (error) {
                    logger.error('Decryption failed', error);
                    resolve(null);
                }
            };

            request.onerror = () => {
                logger.error('Failed to retrieve data', request.error);
                reject(request.error);
            };
        });
    }

    async delete(key: string): Promise<void> {
        await this.init();
        if (!this.db) throw new Error('DB not initialized');

        return new Promise((resolve, reject) => {
            const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.delete(key);

            request.onsuccess = () => {
                logger.debug('Deleted data', { key });
                resolve();
            };
            request.onerror = () => {
                logger.error('Failed to delete data', request.error);
                reject(request.error);
            };
        });
    }

    async clear(): Promise<void> {
        await this.init();
        if (!this.db) throw new Error('DB not initialized');

        return new Promise((resolve, reject) => {
            const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.clear();

            request.onsuccess = () => {
                logger.debug('Cleared all data');
                resolve();
            };
            request.onerror = () => {
                logger.error('Failed to clear data', request.error);
                reject(request.error);
            };
        });
    }

    // Cleanup expired entries
    async cleanupExpired(): Promise<void> {
        await this.init();
        if (!this.db) throw new Error('DB not initialized');

        return new Promise((resolve, reject) => {
            const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            const index = store.index('expiresAt');

            const range = IDBKeyRange.upperBound(Date.now());
            const request = index.openCursor(range);
            let count = 0;

            request.onsuccess = (event: any) => {
                const cursor = event.target.result;
                if (cursor) {
                    if (cursor.value.expiresAt) {
                        cursor.delete();
                        count++;
                    }
                    cursor.continue();
                } else {
                    if (count > 0) {
                        logger.debug('Cleaned expired entries', { count });
                    }
                    resolve();
                }
            };

            request.onerror = () => {
                logger.error('Cleanup failed', request.error);
                reject(request.error);
            };
        });
    }

    // Get all keys (for debugging)
    async getAllKeys(): Promise<string[]> {
        await this.init();
        if (!this.db) throw new Error('DB not initialized');

        return new Promise((resolve, reject) => {
            const transaction = this.db!.transaction([STORE_NAME], 'readonly');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.getAllKeys();

            request.onsuccess = () => resolve(request.result as string[]);
            request.onerror = () => reject(request.error);
        });
    }
}

export const secureStorage = new SecureStorage();

// Auto-cleanup on app start
if (typeof window !== 'undefined') {
    secureStorage.cleanupExpired().catch(err =>
        logger.error('Auto cleanup failed', err)
    );
}
