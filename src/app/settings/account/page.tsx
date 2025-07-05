'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, User, Mail, Phone, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useStore } from '@/lib/store';
import { toast } from 'sonner';

export default function AccountSettingsPage() {
  const router = useRouter();
  const { isAuthenticated, userData, setUserData, hydrated } = useStore();
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '+1 234 567 8900' // Default phone number
  });
  
  useEffect(() => {
    // Initialize form with user data if authenticated and store is hydrated
    if (hydrated && isAuthenticated && userData) {
      setFormData(prevData => ({
        name: userData.name || '',
        email: userData.email || '',
        phone: prevData.phone // Keep existing phone number
      }));
    }
  }, [hydrated, isAuthenticated, userData]);
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  };
  
  const handleSave = () => {
    if (!hydrated || !isAuthenticated) {
      toast.error('You need to be logged in to save changes');
      return;
    }
    
    // Update user data in Zustand store
    const updatedUserData = {
      ...userData,
      name: formData.name,
      email: formData.email
    };
    
    // Update the store which will automatically persist to localStorage
    setUserData(updatedUserData);
    
    toast.success('Account information updated');
    router.push('/settings');
  };

  return (
    <div className="container max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center mb-6">
        <Button variant="ghost" size="icon" onClick={() => router.push('/settings')} className="mr-4">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-2xl font-semibold">Account Settings</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Personal Information</CardTitle>
          <CardDescription>Update your personal details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!isAuthenticated && (
            <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-300 rounded-md flex items-center gap-2 text-sm">
              <AlertTriangle className="h-4 w-4" />
              <p>You need to be logged in to edit account information.</p>
            </div>
          )}
          
          <div className="space-y-2">
            <Label htmlFor="name">Full Name</Label>
            <div className="flex">
              <div className="bg-muted p-2 rounded-l-md flex items-center">
                <User className="h-4 w-4 text-muted-foreground" />
              </div>
              <Input 
                id="name" 
                value={formData.name} 
                onChange={handleChange} 
                className="rounded-l-none" 
                disabled={!isAuthenticated}
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <div className="flex">
              <div className="bg-muted p-2 rounded-l-md flex items-center">
                <Mail className="h-4 w-4 text-muted-foreground" />
              </div>
              <Input 
                id="email" 
                value={formData.email} 
                onChange={handleChange} 
                type="email" 
                className="rounded-l-none" 
                disabled={!isAuthenticated}
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number</Label>
            <div className="flex">
              <div className="bg-muted p-2 rounded-l-md flex items-center">
                <Phone className="h-4 w-4 text-muted-foreground" />
              </div>
              <Input 
                id="phone" 
                value={formData.phone} 
                onChange={handleChange} 
                type="tel" 
                className="rounded-l-none"
                disabled={!isAuthenticated}
              />
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => router.push('/settings')}>Cancel</Button>
          <Button 
            onClick={handleSave}
            disabled={!isAuthenticated}
          >
            Save Changes
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
