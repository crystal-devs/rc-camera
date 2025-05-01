// services/auth.service.ts

import axios from 'axios';
import { API_BASE_URL } from '@/lib/api-config';

// Authenticate user and get token
export const authenticateUser = async (): Promise<string> => {
  try {
    const response = await axios.post(`${API_BASE_URL}/auth/login`, {
      email: 'adwaith@gmail.com',
      name: 'Clicky',
      provider: 'google',
    });

    const token = response.data.token;
    return token;
  } catch (error) {
    console.error('Authentication error:', error);
    throw new Error('Failed to authenticate user');
  }
};