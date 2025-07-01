'use client';

import { useState } from 'react';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuthToken } from '@/hooks/use-auth';
import { API_BASE_URL } from '@/lib/api-config';
import { toast } from 'sonner';

type RequestMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

export default function ApiTester() {
  const [endpoint, setEndpoint] = useState<string>('');
  const [method, setMethod] = useState<RequestMethod>('GET');
  const [body, setBody] = useState<string>('');
  const [response, setResponse] = useState<any>(null);
  const [error, setError] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const token = useAuthToken();

  const handleApiCall = async () => {
    if (!endpoint) {
      toast.error('Please enter an endpoint');
      return;
    }

    if (!token) {
      toast.error('Not authenticated. Please log in');
      return;
    }

    setLoading(true);
    setResponse(null);
    setError(null);

    try {
      // Build the full URL
      const url = endpoint.startsWith('http')
        ? endpoint
        : endpoint.startsWith('/')
          ? `${API_BASE_URL}${endpoint}`
          : `${API_BASE_URL}/${endpoint}`;

      // Parse body if provided and method is not GET
      let parsedBody;
      if (method !== 'GET' && body.trim() !== '') {
        try {
          parsedBody = JSON.parse(body);
        } catch (e) {
          toast.error('Invalid JSON in request body');
          setLoading(false);
          return;
        }
      }

      // Make the request
      const requestConfig = {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      };

      let result;
      switch (method) {
        case 'GET':
          result = await axios.get(url, requestConfig);
          break;
        case 'POST':
          result = await axios.post(url, parsedBody, requestConfig);
          break;
        case 'PUT':
          result = await axios.put(url, parsedBody, requestConfig);
          break;
        case 'DELETE':
          result = await axios.delete(url, requestConfig);
          break;
      }

      setResponse(result.data);
      toast.success('API call successful');
      
      // Log detailed results for debugging
      console.log('API Response:', {
        status: result.status,
        headers: result.headers,
        data: result.data
      });
    } catch (err) {
      setError(err);
      
      if (axios.isAxiosError(err)) {
        const statusCode = err.response?.status || 'unknown';
        const message = err.response?.data?.message || err.message;
        toast.error(`API error (${statusCode}): ${message}`);
        
        console.error('API Error:', {
          status: err.response?.status,
          headers: err.response?.headers,
          data: err.response?.data,
          message: err.message
        });
      } else {
        toast.error('Unknown error occurred');
        console.error('Unknown error:', err);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleMethodChange = (value: string) => {
    setMethod(value as RequestMethod);
  };

  const commonEndpoints = [
    { label: 'Get Event Albums', endpoint: `/album/event/{eventId}`, method: 'GET' },
    { label: 'Get Default Album', endpoint: `/album/default/{eventId}`, method: 'GET' },
    { label: 'Media Upload Endpoint', endpoint: `/media/upload`, method: 'POST' },
    { label: 'Cover Upload Endpoint', endpoint: `/media/upload-cover`, method: 'POST' },
    { label: 'Check API Health', endpoint: `/health`, method: 'GET' }
  ];

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>API Tester</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Common Endpoints</label>
          <Select onValueChange={(val) => {
            const selected = commonEndpoints.find(e => e.endpoint === val);
            if (selected) {
              setEndpoint(selected.endpoint);
              setMethod(selected.method as RequestMethod);
            }
          }}>
            <SelectTrigger>
              <SelectValue placeholder="Select an endpoint" />
            </SelectTrigger>
            <SelectContent>
              {commonEndpoints.map((item, i) => (
                <SelectItem key={i} value={item.endpoint}>
                  {item.label} ({item.method})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-gray-500 mt-1">Replace {'{eventId}'} with an actual ID</p>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Endpoint</label>
          <Input
            value={endpoint}
            onChange={(e) => setEndpoint(e.target.value)}
            placeholder="e.g., /album/event/123"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Method</label>
          <Select value={method} onValueChange={handleMethodChange}>
            <SelectTrigger>
              <SelectValue placeholder="HTTP Method" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="GET">GET</SelectItem>
              <SelectItem value="POST">POST</SelectItem>
              <SelectItem value="PUT">PUT</SelectItem>
              <SelectItem value="DELETE">DELETE</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {method !== 'GET' && (
          <div>
            <label className="block text-sm font-medium mb-1">Request Body (JSON)</label>
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder='{"key": "value"}'
              className="font-mono"
              rows={5}
            />
          </div>
        )}

        {response && (
          <div>
            <label className="block text-sm font-medium mb-1">Response</label>
            <Textarea
              value={JSON.stringify(response, null, 2)}
              readOnly
              className="font-mono h-60"
            />
          </div>
        )}

        {error && (
          <div>
            <label className="block text-sm font-medium mb-1 text-red-600">Error</label>
            <Textarea
              value={axios.isAxiosError(error)
                ? JSON.stringify({
                  status: error.response?.status,
                  statusText: error.response?.statusText,
                  data: error.response?.data,
                  message: error.message
                }, null, 2)
                : String(error)
              }
              readOnly
              className="font-mono h-60 text-red-600"
            />
          </div>
        )}
      </CardContent>
      <CardFooter>
        <Button 
          onClick={handleApiCall} 
          disabled={loading || !endpoint || !token}
          className="w-full"
        >
          {loading ? 'Sending...' : 'Send Request'}
        </Button>
      </CardFooter>
    </Card>
  );
}
