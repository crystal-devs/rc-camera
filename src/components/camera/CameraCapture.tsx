import React, { useRef, useState, useEffect } from 'react';
import { RefreshCw, CheckCircle, SwitchCamera } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { v4 as uuidv4 } from 'uuid';
import { db } from '@/lib/db';

interface CameraCaptureProps {
  albumId: string;
  userId: number;
  onPhotoCapture?: (photoId: string) => void;
  fullscreen?: boolean;
}

export function CameraCapture({ albumId, userId, onPhotoCapture, fullscreen = false }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isCameraSupported, setIsCameraSupported] = useState<boolean | null>(null);
  const [isBrowser, setIsBrowser] = useState(false);

  // Check if we're in a browser environment
  useEffect(() => {
    setIsBrowser(typeof window !== 'undefined');
  }, []);

  // Check camera support once we're in a browser
  useEffect(() => {
    if (isBrowser) {
      checkCameraSupport();
    }
  }, [isBrowser]);

  const checkCameraSupport = () => {
    // Check if we have the required APIs
    const hasMediaDevices = !!(
      typeof navigator !== 'undefined' &&
      navigator.mediaDevices &&
      typeof navigator.mediaDevices.getUserMedia === 'function'
    );
    
    setIsCameraSupported(hasMediaDevices);
    
    if (!hasMediaDevices) {
      setCameraError('Your browser does not support camera access. Please try using Chrome, Firefox, or Safari.');
    }
  };

  // Clean up when component unmounts
  useEffect(() => {
    return () => {
      stopStream();
    };
  }, []);

  const stopStream = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  const startCamera = async () => {
    // Don't proceed if not in browser or if camera isn't supported
    if (!isBrowser || !isCameraSupported) {
      return;
    }

    setIsLoading(true);
    setCameraError(null);
    
    // Clean up any existing stream
    stopStream();
    
    try {
      const constraints = {
        video: { 
          facingMode: facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      };
      
      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (error: any) {
      console.error('Error accessing camera:', error);
      
      let errorMessage = 'Could not access camera.';
      
      // More specific error messages based on error type
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        errorMessage = 'Camera access was denied. Please allow camera access in your browser settings.';
      } else if (error.name === 'NotFoundError') {
        errorMessage = 'No camera found on this device.';
      } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
        errorMessage = 'Camera is already in use by another application.';
      }
      
      setCameraError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleCamera = () => {
    setFacingMode(prev => prev === 'environment' ? 'user' : 'environment');
    // Restart camera with new facing mode
    setTimeout(() => {
      startCamera();
    }, 100);
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      
      if (!context) return;
      
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      const imageDataUrl = canvas.toDataURL('image/jpeg', 0.9);
      setCapturedImage(imageDataUrl);
    }
  };

  const retakePhoto = () => {
    setCapturedImage(null);
  };

  const savePhoto = async () => {
    if (!capturedImage) return;
    
    setIsLoading(true);
    try {
      // Get location if available
      let location = null;
      try {
        if (navigator.geolocation) {
          const position = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              timeout: 5000,
              maximumAge: 0
            });
          });
          location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
        }
      } catch (error) {
        console.log('Location not available');
      }
      
      const photoId = uuidv4();
      const photo = {
        id: photoId,
        albumId,
        takenBy: userId,
        imageUrl: capturedImage,
        createdAt: new Date(),
        metadata: {
          location,
          device: navigator.userAgent
        }
      };
      
      await db.photos.add(photo);
      
      if (onPhotoCapture) {
        onPhotoCapture(photoId);
      }
      
      setCapturedImage(null);
    } catch (error) {
      console.error('Error saving photo:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  // If we're not in a browser or we're in SSR, render a placeholder or nothing
  if (!isBrowser) {
    return null;
  }
  
  // Request camera access when needed
  const handleCameraRequest = () => {
    startCamera();
  };

  return (
    <div className={`flex flex-col items-center ${fullscreen ? 'h-full' : ''}`}>
      {cameraError ? (
        <div className="flex flex-col items-center justify-center h-full w-full">
          <p className="text-red-500 mb-4 text-center px-4">{cameraError}</p>
          <Button 
            onClick={handleCameraRequest} 
            disabled={!isCameraSupported || isLoading}
          >
            {isLoading ? 'Requesting...' : 'Grant Camera Permission'}
          </Button>
        </div>
      ) : !stream ? (
        <div className="flex flex-col items-center justify-center h-full w-full">
          <p className="mb-4 text-center px-4">Camera access is needed to take photos</p>
          <Button 
            onClick={handleCameraRequest} 
            disabled={!isCameraSupported || isLoading}
          >
            {isLoading ? 'Requesting...' : 'Access Camera'}
          </Button>
        </div>
      ) : (
        <>
          <div className={`relative ${fullscreen ? 'w-full h-full' : 'w-full max-w-md aspect-[3/4]'} bg-black rounded-lg overflow-hidden`}>
            {!capturedImage ? (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
            ) : (
              <img 
                src={capturedImage} 
                alt="Captured" 
                className="w-full h-full object-cover" 
              />
            )}
            <canvas ref={canvasRef} className="hidden" />
          </div>
          
          {!fullscreen && !capturedImage && (
            <div className="absolute top-4 right-4 flex gap-2">
              <Button 
                variant="outline" 
                size="icon" 
                onClick={toggleCamera} 
                className="rounded-full bg-black/30 backdrop-blur-sm border-0 text-white hover:bg-black/40"
              >
                <SwitchCamera className="h-5 w-5"/>
              </Button>
            </div>
          )}
          
          {fullscreen && !capturedImage && (
            <div className="absolute top-4 left-4 flex gap-2">
              <Button 
                variant="outline" 
                size="icon" 
                onClick={toggleCamera} 
                className="rounded-full bg-black/30 backdrop-blur-sm border-0 text-white hover:bg-black/40"
              >
                <SwitchCamera className="h-5 w-5" />
              </Button>
            </div>
          )}
          
          <div className={`mt-4 w-full ${fullscreen ? 'absolute bottom-8' : 'max-w-md'} flex justify-center gap-4`}>
            {!capturedImage ? (
              <Button 
                size="lg" 
                onClick={capturePhoto} 
                className="rounded-full w-16 h-16 flex items-center justify-center bg-white text-black hover:bg-gray-200"
              >
                <div className="w-12 h-12 rounded-full border-4 border-black"></div>
              </Button>
            ) : (
              <>
                <Button 
                  variant="outline" 
                  size="lg" 
                  onClick={retakePhoto} 
                  className="rounded-full w-14 h-14 flex items-center justify-center bg-white/20 backdrop-blur-sm text-white border-0"
                  disabled={isLoading}
                >
                  <RefreshCw className="h-6 w-6" />
                </Button>
                <Button 
                  size="lg" 
                  onClick={savePhoto} 
                  className="rounded-full w-14 h-14 flex items-center justify-center bg-white text-black hover:bg-gray-200"
                  disabled={isLoading}
                >
                  <CheckCircle className="h-6 w-6" />
                </Button>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}