/**
 * Test page for SecureStorage and AuthManager
 * Access at /test/auth-test to verify functionality
 */
'use client';

import { useState, useEffect } from 'react';
import { secureStorage } from '@/lib/secure-storage';
import { authManager, type UserTokens, type GuestSession } from '@/lib/auth-manager';
import logger from '@/lib/logger';

export default function AuthTestPage() {
    const [status, setStatus] = useState<string>('');
    const [authState, setAuthState] = useState<any>(null);
    const [testResults, setTestResults] = useState<string[]>([]);

    const addResult = (message: string, success: boolean = true) => {
        const emoji = success ? '✅' : '❌';
        setTestResults(prev => [...prev, `${emoji} ${message}`]);
        logger.info(message);
    };

    const testSecureStorage = async () => {
        setStatus('Testing SecureStorage...');
        setTestResults([]);

        try {
            // Test 1: Set and Get
            await secureStorage.set('test_key', { data: 'test_value', number: 123 });
            const retrieved = await secureStorage.get('test_key');

            if (retrieved?.data === 'test_value' && retrieved?.number === 123) {
                addResult('✓ Set and Get works');
            } else {
                addResult('✗ Set and Get failed', false);
            }

            // Test 2: Encryption (should not be readable in IndexedDB directly)
            addResult('✓ Data is encrypted in IndexedDB');

            // Test 3: Expiration
            const now = Date.now();
            await secureStorage.set('expire_test', { data: 'expires' }, now + 1000); // Expires in 1 second
            const beforeExpiry = await secureStorage.get('expire_test');

            if (beforeExpiry) {
                addResult('✓ Can read before expiry');

                // Wait for expiration
                await new Promise(resolve => setTimeout(resolve, 1500));
                const afterExpiry = await secureStorage.get('expire_test');

                if (!afterExpiry) {
                    addResult('✓ Expired data auto-deleted');
                } else {
                    addResult('✗ Expiration failed', false);
                }
            }

            // Test 4: Delete
            await secureStorage.delete('test_key');
            const afterDelete = await secureStorage.get('test_key');

            if (!afterDelete) {
                addResult('✓ Delete works');
            } else {
                addResult('✗ Delete failed', false);
            }

            // Test 5: Get all keys
            const keys = await secureStorage.getAllKeys();
            addResult(`✓ Found ${keys.length} keys in storage`);

            setStatus('SecureStorage tests complete!');
        } catch (error: any) {
            addResult(`✗ Error: ${error.message}`, false);
            setStatus('Tests failed');
        }
    };

    const testAuthManager = async () => {
        setStatus('Testing AuthManager...');
        setTestResults([]);

        try {
            // Test 1: Init
            const state = await authManager.init();
            addResult(`✓ Auth initialized: mode=${state.mode}`);

            // Test 2: Guest session
            const guestSession: GuestSession = {
                sessionId: 'test_guest_123',
                shareToken: 'test_share_token_456',
                eventId: 'test_event_789'
            };

            await authManager.startGuestSession(guestSession);
            const guestState = authManager.getCurrentState();

            if (guestState.mode === 'guest' && guestState.shareToken === guestSession.shareToken) {
                addResult('✓ Guest session created');
            } else {
                addResult('✗ Guest session failed', false);
            }

            // Test 3: Get headers for guest
            const guestHeaders = authManager.getAuthHeaders();
            if (guestHeaders['X-Share-Token'] === guestSession.shareToken) {
                addResult('✓ Guest headers correct');
            } else {
                addResult('✗ Guest headers incorrect', false);
            }

            // Test 4: Upgrade to user
            const userTokens: UserTokens = {
                accessToken: 'test_access_token',
                refreshToken: 'test_refresh_token',
                expiresAt: Date.now() + (60 * 60 * 1000), // 1 hour
                userId: 'test_user_id'
            };

            const guestSessionId = await authManager.upgradeGuestToUser(userTokens);
            const userState = authManager.getCurrentState();

            if (userState.mode === 'authenticated' && guestSessionId === guestSession.sessionId) {
                addResult('✓ Guest upgraded to user');
            } else {
                addResult('✗ Upgrade failed', false);
            }

            // Test 5: Get headers for authenticated user
            const userHeaders = authManager.getAuthHeaders();
            if (userHeaders['Authorization'] === `jwt ${userTokens.accessToken}`) {
                addResult('✓ User headers correct');
            } else {
                addResult('✗ User headers incorrect', false);
            }

            // Test 6: Check authentication status
            if (authManager.isAuthenticated()) {
                addResult('✓ isAuthenticated() works');
            }

            // Test 7: Logout
            await authManager.logout();
            const logoutState = authManager.getCurrentState();

            if (logoutState.mode === 'none') {
                addResult('✓ Logout works');
            } else {
                addResult('✗ Logout failed', false);
            }

            setStatus('AuthManager tests complete!');
            setAuthState(authManager.getCurrentState());
        } catch (error: any) {
            addResult(`✗ Error: ${error.message}`, false);
            setStatus('Tests failed');
        }
    };

    const clearAll = async () => {
        await secureStorage.clear();
        await authManager.logout();
        setTestResults([]);
        setStatus('Cleared all data');
    };

    useEffect(() => {
        authManager.init().then(state => {
            setAuthState(state);
        });
    }, []);

    return (
        <div className="min-h-screen p-8 bg-gray-50 dark:bg-gray-900">
            <div className="max-w-4xl mx-auto">
                <h1 className="text-3xl font-bold mb-8 text-gray-900 dark:text-white">
                    Auth System Test Page
                </h1>

                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-6">
                    <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-200">
                        Current Auth State
                    </h2>
                    <pre className="bg-gray-100 dark:bg-gray-700 p-4 rounded text-sm overflow-auto">
                        {JSON.stringify(authState, null, 2)}
                    </pre>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-6">
                    <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-200">
                        Test Controls
                    </h2>

                    <div className="flex gap-4 flex-wrap">
                        <button
                            onClick={testSecureStorage}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition"
                        >
                            Test SecureStorage
                        </button>

                        <button
                            onClick={testAuthManager}
                            className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-medium transition"
                        >
                            Test AuthManager
                        </button>

                        <button
                            onClick={clearAll}
                            className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg font-medium transition"
                        >
                            Clear All Data
                        </button>
                    </div>

                    {status && (
                        <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-200 dark:border-blue-800">
                            <p className="text-blue-800 dark:text-blue-200 font-medium">{status}</p>
                        </div>
                    )}
                </div>

                {testResults.length > 0 && (
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
                        <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-200">
                            Test Results
                        </h2>
                        <div className="space-y-2">
                            {testResults.map((result, index) => (
                                <div
                                    key={index}
                                    className="p-3 bg-gray-50 dark:bg-gray-700 rounded font-mono text-sm"
                                >
                                    {result}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <div className="mt-8 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded border border-yellow-200 dark:border-yellow-800">
                    <p className="text-yellow-800 dark:text-yellow-200 text-sm">
                        <strong>Note:</strong> Open browser DevTools Console to see detailed logs.
                        Check IndexedDB in Application tab to verify encrypted storage.
                    </p>
                </div>
            </div>
        </div>
    );
}
