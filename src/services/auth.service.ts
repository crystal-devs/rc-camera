// services/auth.service.ts

import axios from 'axios';
import { API_BASE_URL } from '@/lib/api-config';
import { getUserData, logout } from './apis/auth.api';

// Re-export getUserData and logout for convenience
export { getUserData, logout };

// Authenticate user and get token
export const authenticateUser = async (
  email: string = 'adwaith@gmail.com',
  name: string = 'Clicky',
  provider: string = 'google',
  profile_pic?: string
): Promise<string> => {
  try {
    const response = await axios.post(`${API_BASE_URL}/auth/login`, {
      email,
      name,
      provider,
      profile_pic
    });

    const token = response.data.token;
    localStorage.setItem("rc-token", token);
    
    // Store user data separately
    const userData = {
      name,
      email,
      avatar: profile_pic,
      provider
    };
    localStorage.setItem("userData", JSON.stringify(userData));
    
    return token;
  } catch (error) {
    console.error('Authentication error:', error);
    throw new Error('Failed to authenticate user');
  }
};