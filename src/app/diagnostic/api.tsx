'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import axios from 'axios';
import { API_BASE_URL } from '@/lib/api-config';

export default function ApiDiagnosticPage() {
  const [results, setResults] = useState<any>({});
  const [isLoading, setIsLoading] = useState(false);

  const testApi = async () => {
    setIsLoading(true);
    setResults({});
    
    try {
      // Test API connectivity directly - this helps identify if the API is running
      const baseUrl = API_BASE_URL;
      console.log('Testing API connectivity to:', baseUrl);
      
      try {
        // Try to get the base endpoint
        const baseResponse = await axios.get(baseUrl, { timeout: 3000 });
        setResults(prev => ({ 
          ...prev, 
          baseEndpoint: { 
            success: true,
            status: baseResponse.status,
            data: baseResponse.data 
          }
        }));
      } catch (baseError: any) {
        setResults(prev => ({ 
          ...prev, 
          baseEndpoint: { 
            success: false,
            error: baseError?.message || 'Unknown error',
            status: baseError?.response?.status
          }
        }));
      }
      
      // Test auth endpoint
      try {
        const authResponse = await axios.get(`${baseUrl}/auth/verify`, { timeout: 3000 });
        setResults(prev => ({ 
          ...prev, 
          authEndpoint: { 
            success: true,
            status: authResponse.status,
            data: authResponse.data 
          }
        }));
      } catch (authError: any) {
        setResults(prev => ({ 
          ...prev, 
          authEndpoint: { 
            success: false,
            error: authError?.message || 'Unknown error',
            status: authError?.response?.status
          }
        }));
      }
      
      // Test event endpoint
      try {
        const token = localStorage.getItem('authToken');
        const eventsResponse = await axios.get(`${baseUrl}/event`, { 
          timeout: 3000,
          headers: token ? { 'Authorization': `Bearer ${token}` } : undefined
        });
        setResults(prev => ({ 
          ...prev, 
          eventsEndpoint: { 
            success: true,
            status: eventsResponse.status,
            data: eventsResponse.data 
          }
        }));
      } catch (eventsError: any) {
        setResults(prev => ({ 
          ...prev, 
          eventsEndpoint: { 
            success: false,
            error: eventsError?.message || 'Unknown error',
            status: eventsError?.response?.status
          }
        }));
      }
      
    } catch (error: any) {
      setResults({ error: error?.message || 'Unknown error occurred' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container py-8">
      <h1 className="text-3xl font-bold mb-6">API Diagnostic Tool</h1>
      
      <Card className="p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Test API Connectivity</h2>
        <p className="mb-4">
          This tool will test the connection to your API server at: <code className="bg-gray-100 px-2 py-1 rounded">{API_BASE_URL}</code>
        </p>
        
        <div className="flex gap-4">
          <Button onClick={testApi} disabled={isLoading}>
            {isLoading ? 'Testing...' : 'Test API Connection'}
          </Button>
        </div>
        
        {Object.keys(results).length > 0 && (
          <div className="mt-6">
            <h3 className="text-lg font-semibold mb-3">Test Results:</h3>
            
            <div className="bg-gray-50 p-4 rounded-md">
              <pre className="whitespace-pre-wrap overflow-auto max-h-96">
                {JSON.stringify(results, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </Card>
      
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">API Troubleshooting</h2>
        <ul className="list-disc pl-5 space-y-2">
          <li>Make sure your API server is running at <code>{API_BASE_URL}</code></li>
          <li>Check that CORS is properly configured on your API server to accept requests from your frontend</li>
          <li>Verify that you are using the correct auth token format in your requests</li>
          <li>If using localhost, ensure both frontend and backend servers are running</li>
        </ul>
      </Card>
    </div>
  );
}
