import axios from "axios"
import { LOGIN_ROUTE, VERIFY_USER_ROUTE } from "./z.all-routes"
import { setHeader } from "../common/api.fetch";

export interface UserData {
    id?: string;
    name: string;
    email: string;
    avatar?: string;
    provider: "google" | "instagram";
    profile_pic?: string;
    phone_number?: string;
}

export const loginUser = async (userData: Omit<UserData, 'id'>) => {
    try {
        const { data } = await axios.post(LOGIN_ROUTE, { ...userData });

        if (data.token) {
            localStorage.setItem("rc-token", data.token);
            localStorage.setItem("authToken", data.token);

            // Store user data separately from the token
            const userDataToStore = {
                id: data.userId || undefined,
                name: userData.name,
                email: userData.email,
                avatar: userData.profile_pic || undefined
            };

            localStorage.setItem("userData", JSON.stringify(userDataToStore));
        }

        return data;
    } catch (err) {
        console.error("Login error:", err);
        throw new Error("Failed to authenticate user");
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
    localStorage.removeItem("rc-token");
    localStorage.removeItem("userData");
}

export const verifyUser = async (): Promise<boolean> => {
    try {
        await axios.get(VERIFY_USER_ROUTE, { headers: setHeader() });
        return true;
    } catch {
        return false;
    }
};
