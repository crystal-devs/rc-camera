import axios from "axios"
import { LOGIN_ROUTE, REGISTER_ROUTE, REFRESH_TOKEN_ROUTE, LOGOUT_ROUTE, VERIFY_USER_ROUTE, CSRF_TOKEN_ROUTE, GOOGLE_OAUTH_ROUTE } from "./z.all-routes"
import { setHeader } from "../common/api.fetch";

export interface UserData {
    id?: string;
    name: string;
    email: string;
    avatar?: string;
    provider: "google" | "email";
    profile_pic?: string;
    phone_number?: string;
}

export interface AuthTokens {
    accessToken: string;
    refreshToken: string;
    expiresAt: number;
}

export interface LoginCredentials {
    email: string;
    password: string;
    provider?: "google" | "email";
}

export interface RegisterCredentials {
    name: string;
    email: string;
    password: string;
}

export const loginUser = async (credentials: LoginCredentials): Promise<{ user: UserData; tokens: AuthTokens }> => {
    try {
        const { data } = await axios.post(LOGIN_ROUTE, credentials, {
            headers: setHeader(undefined, "application/json", true)
        });

        console.log("Login API response:", data);

        // Check if the response indicates success (status: true)
        if (data.status === true) {
            // Handle both response formats: with data wrapper or direct response
            const responseData = data.data || data;
            const { user, token: accessToken, refreshToken, expiresAt } = responseData;

            // Store tokens securely
            const tokens: AuthTokens = { accessToken, refreshToken, expiresAt };
            localStorage.setItem("rc-tokens", JSON.stringify(tokens));
            localStorage.setItem("rc-token", accessToken); // Keep for backward compatibility

            // Store user data
            const userDataToStore: UserData = {
                id: user.id,
                name: user.name,
                email: user.email,
                avatar: user.avatar,
                provider: (user.provider || 'email') as "google" | "email"
            };
            localStorage.setItem("userData", JSON.stringify(userDataToStore));

            // Get new CSRF token after successful login
            await getCsrfToken();

            return { user: userDataToStore, tokens };
        }

        // If status is not true, treat it as an error
        console.log("Login failed with response:", data);
        throw new Error(data.message || "Login failed");
    } catch (err: any) {
        console.error("Login error:", err);
        console.error("Error response:", err.response?.data);
        throw new Error(err.response?.data?.message || "Failed to authenticate user");
    }
}

export const registerUser = async (credentials: RegisterCredentials): Promise<{ user: UserData; tokens: AuthTokens }> => {
    try {
        const { data } = await axios.post(REGISTER_ROUTE, credentials, {
            headers: setHeader(undefined, "application/json", true)
        });

        console.log("Register API response:", data);

        // Check if the response indicates success (status: true)
        if (data.status === true) {
            // Handle both response formats: with data wrapper or direct response
            const responseData = data.data || data;
            const { user, token: accessToken, refreshToken, expiresAt } = responseData;

            // Store tokens securely
            const tokens: AuthTokens = { accessToken, refreshToken, expiresAt };
            localStorage.setItem("rc-tokens", JSON.stringify(tokens));
            localStorage.setItem("rc-token", accessToken); // Keep for backward compatibility

            // Store user data
            const userDataToStore: UserData = {
                id: user.id,
                name: user.name,
                email: user.email,
                avatar: user.avatar,
                provider: (user.provider || 'email') as "google" | "email"
            };
            localStorage.setItem("userData", JSON.stringify(userDataToStore));

            // Get new CSRF token after successful registration
            await getCsrfToken();

            return { user: userDataToStore, tokens };
        }

        // If status is not true, treat it as an error
        console.log("Registration failed with response:", data);
        throw new Error(data.message || "Registration failed");
    } catch (err: any) {
        console.error("Registration error:", err);
        console.error("Error response:", err.response?.data);
        throw new Error(err.response?.data?.message || "Failed to register user");
    }
}

export const refreshAccessToken = async (): Promise<AuthTokens | null> => {
    try {
        const storedTokens = localStorage.getItem("rc-tokens");
        if (!storedTokens) return null;

        const tokens: AuthTokens = JSON.parse(storedTokens);
        if (!tokens.refreshToken) return null;

        const { data } = await axios.post(REFRESH_TOKEN_ROUTE, {
            refreshToken: tokens.refreshToken
        }, {
            headers: setHeader(undefined, "application/json", true)
        });

        if (data.status === true && data.data) {
            const newTokens: AuthTokens = {
                accessToken: data.data.token,
                refreshToken: data.data.refreshToken || tokens.refreshToken, // Use new refresh token if provided
                expiresAt: data.data.expiresAt
            };

            // Update stored tokens
            localStorage.setItem("rc-tokens", JSON.stringify(newTokens));
            localStorage.setItem("rc-token", newTokens.accessToken); // Keep for backward compatibility

            return newTokens;
        }

        return null;
    } catch (err) {
        console.error("Token refresh error:", err);
        return null;
    }
}

export const logoutUser = async (): Promise<void> => {
    try {
        const storedTokens = localStorage.getItem("rc-tokens");
        if (storedTokens) {
            const tokens: AuthTokens = JSON.parse(storedTokens);
            await axios.post(LOGOUT_ROUTE, {
                refreshToken: tokens.refreshToken
            }, {
                headers: setHeader()
            });
        }
    } catch (err) {
        console.error("Logout error:", err);
        // Continue with local cleanup even if server logout fails
    } finally {
        // Clear all stored auth data
        localStorage.removeItem("rc-tokens");
        localStorage.removeItem("rc-token");
        localStorage.removeItem("authToken");
        localStorage.removeItem("userData");
        localStorage.removeItem("csrf-token");
    }
}

export const initiateGoogleOAuth = (): void => {
    // Redirect to Google OAuth endpoint
    window.location.href = `${GOOGLE_OAUTH_ROUTE}?redirect_uri=${encodeURIComponent(window.location.origin + '/auth/callback')}`;
}

export const handleGoogleOAuthCallback = async (code: string): Promise<{ user: UserData; tokens: AuthTokens }> => {
    try {
        const { data } = await axios.post(`${GOOGLE_OAUTH_ROUTE}/callback`, {
            code,
            redirectUri: window.location.origin + '/auth/callback'
        }, {
            headers: setHeader(undefined, "application/json", true)
        });

        if (data.status === true && data.data) {
            const { user, token: accessToken, refreshToken, expiresAt } = data.data;

            // Store tokens securely
            const tokens: AuthTokens = { accessToken, refreshToken, expiresAt };
            localStorage.setItem("rc-tokens", JSON.stringify(tokens));
            localStorage.setItem("rc-token", accessToken); // Keep for backward compatibility

            // Store user data
            const userDataToStore: UserData = {
                id: user.id,
                name: user.name,
                email: user.email,
                avatar: user.avatar,
                provider: 'google'
            };
            localStorage.setItem("userData", JSON.stringify(userDataToStore));

            // Get new CSRF token after successful login
            await getCsrfToken();

            return { user: userDataToStore, tokens };
        }

        throw new Error(data.message || "Google OAuth failed");
    } catch (err: any) {
        console.error("Google OAuth callback error:", err);
        throw new Error(err.response?.data?.message || "Failed to complete Google authentication");
    }
}

export const getUserData = (): UserData | null => {
    try {
        const userDataString = localStorage.getItem("userData");
        if (!userDataString) return null;

        const userData = JSON.parse(userDataString);

        // Ensure the data has the required fields for the UserData type
        // Even if some fields are missing, we'll ensure a consistent shape
        return {
            id: userData.id,
            name: userData.name || 'User',
            email: userData.email || '',
            avatar: userData.avatar || userData.profile_pic,
            provider: userData.provider || 'google'
        };
    } catch (error) {
        console.error("Error retrieving user data:", error);
        return null;
    }
}

export const logout = () => {
    // Use the new logout function instead
    logoutUser().catch(err => console.error("Logout error:", err));
}

export const verifyUser = async (router?: any) => {
    try{
        await axios.get(VERIFY_USER_ROUTE, {
            headers: setHeader()
        })
        return true
    }catch(error){
        console.log(error)
        // router.push('/login')
        return false
    }
}

export const verifyUserAndIfNotThenRedirectToLogin = async (router: any) => {
    try{
        await axios.get(VERIFY_USER_ROUTE, {
            headers: setHeader()
        })
        return true
    }catch(error){
        console.log(error)
        router.push('/login')
        return false
    }
};

// CSRF Token utilities
export const getCsrfToken = async () => {
    try {
        const response = await axios.get(CSRF_TOKEN_ROUTE);
        const csrfToken = response.data.csrfToken;
        if (csrfToken) {
            localStorage.setItem('csrf-token', csrfToken);
        }
        return csrfToken;
    } catch (error) {
        console.error('Failed to get CSRF token:', error);
        return null;
    }
};

export const initializeCsrf = async () => {
    const csrfToken = await getCsrfToken();
    return csrfToken;
};

