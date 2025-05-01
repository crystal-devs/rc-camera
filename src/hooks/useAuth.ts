// // hooks/useAuth.ts

// import { useState, useEffect, useCallback } from 'react';
// import { toast } from 'sonner';
// import { authService, initializeAuthFromStorage } from '@/services/apis/events.api';

// export const useAuth = () => {
//     const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
//     const [isLoading, setIsLoading] = useState<boolean>(true);
//     const [userId, setUserId] = useState<string | null>(null);

//     // Initialize auth state from localStorage
//     useEffect(() => {
//         const token = initializeAuthFromStorage();
//         if (token) {
//             setIsAuthenticated(true);
//             // In a real app, you might decode the JWT to get the user ID
//             // For now, we'll just set it to true to indicate authenticated status
//         }
//         setIsLoading(false);
//     }, []);

//     // Login function
//     const login = useCallback(async (email: string, name: string, provider: string = 'google') => {
//         setIsLoading(true);
//         try {
//             const response = await authService.login(email, name, provider);
//             setIsAuthenticated(true);

//             // In a real app, you would extract the user ID from the token or response
//             // setUserId(response.user._id);

//             return response;
//         } catch (error) {
//             toast.error('Failed to authenticate');
//             console.error('Authentication error:', error);
//             throw error;
//         } finally {
//             setIsLoading(false);
//         }
//     }, []);

//     // Logout function
//     const logout = useCallback(() => {
//         localStorage.removeItem('authToken');
//         setIsAuthenticated(false);
//         setUserId(null);
//     }, []);

//     // Helper function to ensure a user is authenticated
//     const ensureAuthenticated = useCallback(async () => {
//         if (isAuthenticated) return true;

//         // For demo purposes, automatically log in as a default user
//         try {
//             await login('adwaith@gmail.com', 'Clicky', 'google');
//             return true;
//         } catch (error) {
//             return false;
//         }
//     }, [isAuthenticated, login]);

//     return {
//         isAuthenticated,
//         isLoading,
//         userId,
//         login,
//         logout,
//         ensureAuthenticated
//     };
// };