"use client";
import { useEffect, useState } from 'react';

export const useAuthToken = () => {
  const [token, setToken] = useState('');

  useEffect(() => {
    const tokenFromStorage = localStorage.getItem('authToken') || '';
    setToken(tokenFromStorage);
  }, [setToken]);

  return token;
};
