'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { useAuthToken } from '@/hooks/use-auth';
import axios from 'axios';
import { API_BASE_URL } from '@/lib/api-config';

export default function UploadDiagnostic() {
  const [file, setFile] = useState<File | null>(null);
  const [albumId, setAlbumId] = useState('');
  const [eventId, setEventId] = useState('');
  const [response, setResponse] = useState<any>(null);
  const [error, setError] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const token = useAuthToken();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      setFile(files[0]);
    }
  };

  const handleDirectUpload = async () => {
    if (!file) {
      toast.error('Please select a file first');
      return;
    }

    if (!albumId && !eventId) {
      toast.error('Please provide either an Album ID or an Event ID');
      return;
    }

    if (!token) {
      toast.error('Not authenticated. Please log in');
      return;
    }

    setIsLoading(true);
    setResponse(null);
    setError(null);

    // Create form data
    const formData = new FormData();
    formData.append('image', file);
    
    if (albumId) {
      formData.append('album_id', albumId);
    }
    
    if (eventId) {
      formData.append('event_id', eventId);
    }

    // Log what we're sending
    console.log('File being uploaded:', {
      name: file.name,
      type: file.type,
      size: file.size + ' bytes',
    });

    console.log('Form data:', {
      albumId: albumId || 'Not provided',
      eventId: eventId || 'Not provided',
      token: token ? 'Valid token provided' : 'No token',
    });

    try {
      // Make the direct API call
      const apiResponse = await axios.post(`${API_BASE_URL}/media/upload`, formData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          // Don't set Content-Type for FormData with files
        }
      });

      setResponse(apiResponse.data);
      toast.success('Upload successful!');
      
      console.log('Full API response:', apiResponse);
      console.log('Response status:', apiResponse.status);
      console.log('Response data:', apiResponse.data);
    } catch (err) {
      setError(err);
      
      if (axios.isAxiosError(err)) {
        console.error('API error status:', err.response?.status);
        console.error('API error data:', err.response?.data);
        console.error('API error headers:', err.response?.headers);
        
        // Extract detailed error info
        const errorStatus = err.response?.status || 'unknown';
        const errorMessage = err.response?.data?.message || err.message;
        toast.error(`Upload failed (${errorStatus}): ${errorMessage}`);
      } else {
        console.error('Unknown error:', err);
        toast.error('Upload failed with an unknown error');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto my-4">
      <CardHeader>
        <CardTitle>Upload Diagnostic Tool</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Select File</label>
          <Input type="file" onChange={handleFileChange} />
          {file && (
            <div className="mt-2 text-sm">
              Selected: {file.name} ({Math.round(file.size / 1024)} KB, {file.type})
            </div>
          )}
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1">Album ID (optional)</label>
          <Input
            type="text"
            placeholder="Enter album ID"
            value={albumId}
            onChange={(e) => setAlbumId(e.target.value)}
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1">Event ID (optional)</label>
          <Input
            type="text"
            placeholder="Enter event ID"
            value={eventId}
            onChange={(e) => setEventId(e.target.value)}
          />
        </div>

        {response && (
          <div className="mt-4">
            <label className="block text-sm font-medium mb-1">Response:</label>
            <Textarea
              className="h-40"
              readOnly
              value={JSON.stringify(response, null, 2)}
            />
          </div>
        )}

        {error && (
          <div className="mt-4">
            <label className="block text-sm font-medium mb-1 text-red-600">Error:</label>
            <Textarea
              className="h-40 text-red-600"
              readOnly
              value={axios.isAxiosError(error)
                ? JSON.stringify({
                    status: error.response?.status,
                    statusText: error.response?.statusText,
                    data: error.response?.data,
                    message: error.message
                  }, null, 2)
                : String(error)
              }
            />
          </div>
        )}
      </CardContent>
      <CardFooter>
        <Button 
          onClick={handleDirectUpload} 
          className="w-full" 
          disabled={isLoading || !file || (!albumId && !eventId) || !token}
        >
          {isLoading ? 'Uploading...' : 'Test Direct Upload'}
        </Button>
      </CardFooter>
    </Card>
  );
}
