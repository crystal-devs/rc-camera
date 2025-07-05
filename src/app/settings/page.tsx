'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Moon, Sun, Monitor, Bell, Lock, User, Languages, AccessibilityIcon, HardDrive, HelpCircle, LogIn, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { LoginPrompt } from './components/login-prompt';
import { useStore } from '@/lib/store';
import { SubscriptionAndStorage, SubscriptionPlanSelector } from '@/components/subscription/SubscriptionAndStorage';

export default function SettingsPage() {
  const router = useRouter();
  const { 
    theme, 
    setTheme, 
    requireAuthForSettings, 
    setRequireAuthForSettings,
    privateProfile,
    setPrivateProfile,
    autoSave,
    setAutoSave,
    isAuthenticated,
    hydrated,
    logout: storeLogout
  } = useStore();
  
  const [notifications, setNotifications] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(true);

  const handleThemeChange = (newTheme: 'light' | 'dark' | 'system') => {
    setTheme(newTheme);
    toast.success(`Theme set to ${newTheme}`);
  };
  
  const handleLogout = () => {
    storeLogout(); // Use the Zustand store logout function
    toast.success('Logged out successfully');
    // No need to reload the page, Zustand will update the state
  };

  return (
    <div className="container max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <Button variant="ghost" size="icon" onClick={() => router.back()} className="mr-4">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-semibold">Settings</h1>
        </div>
        
        {hydrated && isAuthenticated ? (
          <Button variant="outline" size="sm" onClick={handleLogout} className="gap-2">
            <LogOut className="h-4 w-4" />
            <span>Logout</span>
          </Button>
        ) : (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => {
              localStorage.setItem('redirectAfterLogin', window.location.pathname);
              router.push('/login');
            }} 
            className="gap-2"
          >
            <LogIn className="h-4 w-4" />
            <span>Login</span>
          </Button>
        )}
      </div>
      
      {hydrated && !isAuthenticated && <LoginPrompt />}
      
      {/* Display subscription and storage information for all users */}
      <SubscriptionAndStorage />
      
      {/* Display available subscription plans */}
      <SubscriptionPlanSelector />
      
      <div className="space-y-6">
        {/* Appearance */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center">
              <Sun className="h-5 w-5 mr-2" />
              Appearance
            </CardTitle>
            <CardDescription>Customize how the app looks and feels</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex flex-col gap-6">
                <div className="grid grid-cols-3 gap-2">
                  <Button 
                    onClick={() => handleThemeChange('light')}
                    variant={theme === 'light' ? 'default' : 'outline'}
                    className="flex flex-col items-center gap-1 h-auto py-3"
                  >
                    <Sun className="h-5 w-5" />
                    <span>Light</span>
                  </Button>
                  <Button 
                    onClick={() => handleThemeChange('dark')}
                    variant={theme === 'dark' ? 'default' : 'outline'}
                    className="flex flex-col items-center gap-1 h-auto py-3"
                  >
                    <Moon className="h-5 w-5" />
                    <span>Dark</span>
                  </Button>
                  <Button 
                    onClick={() => handleThemeChange('system')}
                    variant={theme === 'system' ? 'default' : 'outline'}
                    className="flex flex-col items-center gap-1 h-auto py-3"
                  >
                    <Monitor className="h-5 w-5" />
                    <span>System</span>
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center">
              <Bell className="h-5 w-5 mr-2" />
              Notifications
            </CardTitle>
            <CardDescription>Manage your notification preferences</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Push Notifications</p>
                  <p className="text-sm text-muted-foreground">Receive notifications on your device</p>
                </div>
                <Switch 
                  checked={notifications} 
                  onCheckedChange={setNotifications} 
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Email Notifications</p>
                  <p className="text-sm text-muted-foreground">Receive updates and alerts via email</p>
                </div>
                <Switch 
                  checked={emailNotifications} 
                  onCheckedChange={setEmailNotifications} 
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Security Settings */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center">
              <Lock className="h-5 w-5 mr-2" />
              Security
            </CardTitle>
            <CardDescription>Control access and security settings</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Require Login for Settings</p>
                  <p className="text-sm text-muted-foreground">Protect settings access with authentication</p>
                </div>
                <Switch 
                  checked={requireAuthForSettings} 
                  onCheckedChange={setRequireAuthForSettings}
                  disabled={!hydrated || !isAuthenticated}
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Private Profile</p>
                  <p className="text-sm text-muted-foreground">Only share your profile with approved users</p>
                </div>
                <Switch 
                  checked={privateProfile} 
                  onCheckedChange={setPrivateProfile}
                  disabled={!hydrated || !isAuthenticated}
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Auto Save</p>
                  <p className="text-sm text-muted-foreground">Automatically save changes</p>
                </div>
                <Switch 
                  checked={autoSave} 
                  onCheckedChange={setAutoSave}
                  disabled={!hydrated || !isAuthenticated}
                />
              </div>
              {hydrated && !isAuthenticated && (
                <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-300 rounded-md text-sm">
                  <p>Security features are limited without authentication. <button onClick={() => router.push('/login')} className="underline font-medium">Login now</button> to access all features.</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Other Settings */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">More Settings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <SettingItem 
                icon={<User className="h-5 w-5" />}
                title="Account"
                description="Manage your account information"
                onClick={() => router.push('/settings/account')}
              />
              <Separator />
              <SettingItem 
                icon={<Lock className="h-5 w-5" />}
                title="Privacy & Security"
                description="Control your privacy settings and security options"
                onClick={() => router.push('/settings/privacy')}
              />
              <Separator />
              <SettingItem 
                icon={<Languages className="h-5 w-5" />}
                title="Language"
                description="Change your preferred language"
                onClick={() => router.push('/settings/language')}
              />
              <Separator />
              <SettingItem 
                icon={<AccessibilityIcon className="h-5 w-5" />}
                title="Accessibility"
                description="Customize accessibility options"
                onClick={() => router.push('/settings/accessibility')}
              />
              <Separator />
              <SettingItem 
                icon={<HardDrive className="h-5 w-5" />}
                title="Storage & Data"
                description="Manage your storage and data usage"
                onClick={() => router.push('/settings/storage')}
              />
              <Separator />
              <SettingItem 
                icon={<HelpCircle className="h-5 w-5" />}
                title="Help & Support"
                description="Get help and contact support"
                onClick={() => router.push('/settings/help')}
              />
            </div>
          </CardContent>
        </Card>
        
        <div className="text-center text-xs text-muted-foreground pt-4 pb-8">
          Version 1.0.0 • Terms of Service • Privacy Policy
        </div>
      </div>
    </div>
  );
}

function SettingItem({ icon, title, description, onClick }: {
  icon: React.ReactNode;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button 
      onClick={onClick}
      className="flex items-center justify-between w-full group text-left"
    >
      <div className="flex items-center">
        <div className="mr-3 text-muted-foreground">{icon}</div>
        <div>
          <p className="font-medium">{title}</p>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
      <ArrowLeft className="h-5 w-5 transform rotate-180 text-muted-foreground opacity-70 group-hover:opacity-100 transition-opacity" />
    </button>
  );
}
