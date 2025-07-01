'use client';

import UploadDiagnostic from '@/components/album/UploadDiagnostic';
import MediaUploadDebugger from '@/components/album/MediaUploadDebugger';
import ApiTester from '@/components/util/ApiTester';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function DiagnosticPage() {
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">API Diagnostics Tools</h1>
      
      <Tabs defaultValue="upload">
        <TabsList className="mb-4">
          <TabsTrigger value="upload">Upload Diagnostic</TabsTrigger>
          <TabsTrigger value="media">Media Upload</TabsTrigger>
          <TabsTrigger value="api">API Tester</TabsTrigger>
          <TabsTrigger value="troubleshoot">Troubleshooting Guide</TabsTrigger>
        </TabsList>
        
        <TabsContent value="upload">
          <Card>
            <CardHeader>
              <CardTitle>Media Upload Troubleshooting</CardTitle>
              <CardDescription>
                This tool helps diagnose issues with media uploads by making direct API calls
              </CardDescription>
            </CardHeader>
            <CardContent>
              <UploadDiagnostic />
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="media">
          <Card>
            <CardHeader>
              <CardTitle>Media Upload Debugger</CardTitle>
              <CardDescription>
                Advanced media upload testing tool with detailed logs and direct API access
              </CardDescription>
            </CardHeader>
            <CardContent>
              <MediaUploadDebugger />
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="api">
          <Card>
            <CardHeader>
              <CardTitle>API Testing Tool</CardTitle>
              <CardDescription>
                Test any API endpoint with custom parameters and see the raw response
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ApiTester />
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="troubleshoot">
          <Card>
            <CardHeader>
              <CardTitle>Troubleshooting Guide</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium mb-2">Common Error Types</h3>
                  <ul className="list-disc pl-5 space-y-2">
                    <li>
                      <strong>413 Error</strong>: File is too large for the server's configured limit.
                      Try a smaller file or check server configuration.
                    </li>
                    <li>
                      <strong>415 Error</strong>: Unsupported media type. Make sure you're uploading a valid image format
                      (JPEG, PNG, GIF, etc.).
                    </li>
                    <li>
                      <strong>401/403 Error</strong>: Authentication issues. Try logging out and back in.
                    </li>
                    <li>
                      <strong>500 Error</strong>: Server-side error. Could be incorrect field names in the FormData,
                      incorrect API endpoint, or issues with the server processing the upload.
                    </li>
                    <li>
                      <strong>CORS Error</strong>: If you see CORS errors in the console, the API might not be configured to
                      accept requests from your current domain.
                    </li>
                  </ul>
                </div>
                
                <div className="p-4 bg-gray-100 rounded-md">
                  <h3 className="text-lg font-medium mb-2">Important Server Settings to Check</h3>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Multer field name: should be <code className="bg-gray-200 px-1 rounded">image</code></li>
                    <li>Maximum file size limit (often set in Multer configuration)</li>
                    <li>Allowed file types/MIME types filter</li>
                    <li>Storage configuration (temp directory writable?)</li>
                    <li>Request body size limit in Express or Nginx</li>
                  </ul>
                </div>
                
                <div className="p-4 bg-blue-50 rounded-md">
                  <h3 className="text-lg font-medium mb-2">Backend Code Review</h3>
                  <p className="mb-2">The server's upload endpoint should have a Multer configuration similar to:</p>
                  <pre className="bg-gray-900 text-gray-100 p-3 rounded text-sm overflow-auto">
{`const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, './uploads'),
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
      cb(null, uniqueSuffix + '-' + file.originalname);
    }
  }),
  fileFilter: (req, file, cb) => {
    // Accept images only
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Only image files are allowed!'), false);
    }
    cb(null, true);
  },
  limits: {
    fileSize: 10 * 1024 * 1024 // 10 MB
  }
});

// Then used in route:
router.post('/upload', upload.single('image'), (req, res) => {
  // req.file contains the uploaded file info
  // req.body contains the text fields
});`}
                  </pre>
                </div>
                
                <div className="p-4 bg-yellow-50 rounded-md">
                  <h3 className="text-lg font-medium mb-2">Client-Side Checklist</h3>
                  <ol className="list-decimal pl-5 space-y-1">
                    <li>Ensure FormData includes correct field name (<code>image</code>)</li>
                    <li>Valid authorization token is included in the request header</li>
                    <li>File is a valid image format and not corrupted</li>
                    <li>File size is below server limits (10MB recommended max)</li>
                    <li>All required fields are included (album_id or event_id)</li>
                  </ol>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
