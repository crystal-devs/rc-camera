'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import axios from 'axios';
import { API_BASE_URL } from '@/lib/api-config';

export default function MediaUploadDebugger() {
  const [file, setFile] = useState<File | null>(null);
  const [eventId, setEventId] = useState('');
  const [albumId, setAlbumId] = useState('');
  const [response, setResponse] = useState<any>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [logMessages, setLogMessages] = useState<string[]>([]);
  const [authToken, setAuthToken] = useState<string>('');
  
  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (token) {
      setAuthToken(token);
    }
  }, []);
  
  const addLog = (message: string) => {
    setLogMessages(prev => [`[${new Date().toLocaleTimeString()}] ${message}`, ...prev]);
  };
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      addLog(`File selected: ${selectedFile.name} (${(selectedFile.size/1024).toFixed(1)} KB, ${selectedFile.type})`);
    }
  };
  
  const testUpload = async () => {
    if (!file) {
      toast.error('Please select a file first');
      return;
    }
    
    if (!eventId) {
      toast.error('Event ID is required by the backend');
      return;
    }
    
    if (!authToken) {
      toast.error('No auth token found. Please log in first');
      return;
    }
    
    setIsUploading(true);
    addLog('Starting upload test...');
    
    const formData = new FormData();
    formData.append('image', file);
    formData.append('event_id', eventId);
    
    if (albumId) {
      formData.append('album_id', albumId);
      addLog(`Added album_id: ${albumId}`);
    } else {
      addLog('No album_id provided - server should use default album');
    }
    
    addLog(`Added event_id: ${eventId}`);
    
    try {
      addLog(`Sending request to ${API_BASE_URL}/media/upload`);
      
      const uploadResponse = await axios.post(`${API_BASE_URL}/media/upload`, formData, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
        onUploadProgress: (progressEvent) => {
          const percent = Math.round((progressEvent.loaded * 100) / (progressEvent.total || 1));
          if (percent % 20 === 0) { // Log at 0%, 20%, 40%, etc.
            addLog(`Upload progress: ${percent}%`);
          }
        }
      });
      
      setResponse(uploadResponse.data);
      
      if (uploadResponse.data && uploadResponse.data.status === true) {
        toast.success('Upload successful!');
        addLog('Upload completed successfully');
        
        if (uploadResponse.data.data?.url) {
          addLog(`Uploaded image URL: ${uploadResponse.data.data.url}`);
        }
      } else {
        toast.error(uploadResponse.data?.message || 'Upload failed with unknown error');
        addLog(`Upload failed: ${uploadResponse.data?.message || 'Unknown error'}`);
      }
    } catch (error) {
      let errorMessage = 'Upload failed';
      
      if (axios.isAxiosError(error)) {
        addLog(`Error status: ${error.response?.status}`);
        addLog(`Error message: ${error.message}`);
        
        if (error.response?.data) {
          setResponse(error.response.data);
          addLog(`Server error details: ${JSON.stringify(error.response.data)}`);
        }
        
        errorMessage = error.response?.data?.message || error.message;
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      toast.error(errorMessage);
      addLog(`Error: ${errorMessage}`);
    } finally {
      setIsUploading(false);
    }
  };
  
  return (
    <Card className="w-full max-w-3xl mx-auto">
      <CardHeader>
        <CardTitle>Media Upload Debugger</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4">
          <div>
            <Label htmlFor="file">Test Image File</Label>
            <Input id="file" type="file" accept="image/*" onChange={handleFileChange} />
            {file && (
              <p className="text-sm text-gray-500 mt-1">
                Selected: {file.name} ({(file.size/1024).toFixed(1)} KB, {file.type})
              </p>
            )}
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="event-id">Event ID (Required)</Label>
              <Input 
                id="event-id" 
                value={eventId} 
                onChange={(e) => setEventId(e.target.value)} 
                placeholder="Enter event ID"
              />
            </div>
            <div>
              <Label htmlFor="album-id">Album ID (Optional)</Label>
              <Input 
                id="album-id" 
                value={albumId} 
                onChange={(e) => setAlbumId(e.target.value)}
                placeholder="Leave blank for default album" 
              />
            </div>
          </div>
          
          <div>
            <Label>API Log</Label>
            <div className="border rounded-md p-2 h-40 overflow-y-auto bg-black text-green-400 text-sm font-mono">
              {logMessages.length > 0 ? (
                logMessages.map((msg, i) => <div key={i}>{msg}</div>)
              ) : (
                <div className="text-gray-500">No logs yet. Click "Test Upload" to start.</div>
              )}
            </div>
          </div>
          
          {response && (
            <div>
              <Label>Response Data</Label>
              <Textarea 
                readOnly 
                value={JSON.stringify(response, null, 2)} 
                className="font-mono h-40"
              />
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter>
        <Button 
          onClick={testUpload} 
          disabled={isUploading || !file || !eventId || !authToken}
          className="w-full"
        >
          {isUploading ? 'Uploading...' : 'Test Upload'}
        </Button>
      </CardFooter>
    </Card>
  );
}
