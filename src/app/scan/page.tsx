// app/scan/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Html5Qrcode } from 'html5-qrcode';
import { ArrowLeft, ScanLine } from 'lucide-react';

export default function ScanPage() {
  const router = useRouter();
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState('');
  const [qrScanner, setQrScanner] = useState<Html5Qrcode | null>(null);

  useEffect(() => {
    // Initialize QR scanner
    const scanner = new Html5Qrcode('qr-reader');
    setQrScanner(scanner);

    // Cleanup on unmount
    return () => {
      if (scanner && scanning) {
        scanner.stop().catch(error => console.error("Error stopping scanner:", error));
      }
    };
  }, []);

  const startScanner = async () => {
    if (!qrScanner) return;
    
    setScanning(true);
    setScanError('');
    
    try {
      await qrScanner.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        onScanSuccess,
        onScanError
      );
    } catch (error) {
      console.error("Error starting scanner:", error);
      setScanError('Could not access camera. Please allow camera access.');
      setScanning(false);
    }
  };

  const stopScanner = async () => {
    if (qrScanner && scanning) {
      try {
        await qrScanner.stop();
        setScanning(false);
      } catch (error) {
        console.error("Error stopping scanner:", error);
      }
    }
  };

  const onScanSuccess = (decodedText: string) => {
    stopScanner();
    
    try {
      // Handle the scanned QR code
      // Expected format: http://yourdomain.com/join/ABC123
      const url = new URL(decodedText);
      const pathParts = url.pathname.split('/');
      
      if (pathParts.includes('join') && pathParts.length > 2) {
        const accessCode = pathParts[pathParts.indexOf('join') + 1];
        router.push(`/join/${accessCode}`);
      } else {
        setScanError('Invalid QR code');
        setScanning(false);
      }
    } catch (error) {
      console.error("Error processing QR code:", error);
      setScanError('Invalid QR code format');
      setScanning(false);
    }
  };

  const onScanError = (error: any) => {
    console.log("QR scan error:", error);
    // Don't set error for ongoing scan attempts
  };

  return (
    <div className="container mx-auto px-4 py-6 max-w-lg flex flex-col min-h-screen">
      <div className="flex items-center mb-6">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => router.push('/')} 
          className="mr-2"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-semibold">Scan QR Code</h1>
      </div>
      
      <Card className="mb-6 flex-1">
        <CardHeader>
          <CardTitle>Join an Album</CardTitle>
          <CardDescription>
            Scan a QR code to join and contribute to an album
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center">
          <div 
            id="qr-reader" 
            className="w-full max-w-xs aspect-square bg-gray-100 rounded-lg mb-6 overflow-hidden"
          ></div>
          
          {scanError && (
            <div className="text-red-500 text-sm mb-4">
              {scanError}
            </div>
          )}
          
          {!scanning ? (
            <Button onClick={startScanner} className="w-full max-w-xs">
              <ScanLine className="mr-2 h-4 w-4" />
              Start Scanning
            </Button>
          ) : (
            <Button onClick={stopScanner} variant="outline" className="w-full max-w-xs">
              Stop Scanning
            </Button>
          )}
          
          <p className="text-xs text-gray-500 mt-4 text-center">
            Position the QR code in the center of the camera view
          </p>
        </CardContent>
      </Card>
      
      <div className="mt-auto mb-4 text-center">
        <Button 
          variant="link" 
          onClick={() => router.push('/albums/create')}
        >
          Create a new album instead
        </Button>
      </div>
    </div>
  );
}