import React, { useRef } from 'react';
import { UploadCloud } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface UploadButtonProps {
  eventId: string; // Kept for API compatibility if needed elsewhere, but unused here
  onUpload?: (files: File[]) => void; // Changed to accept files directly
  isUploading?: boolean;
  className?: string;
  // Legacy props to ignore/remove
  onUploadComplete?: any;
}

export default function UploadButton({
  eventId,
  onUpload,
  isUploading = false,
  className
}: UploadButtonProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0 && onUpload) {
      onUpload(Array.from(files));
      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className={cn("relative", className)}>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*"
        multiple
        className="hidden"
        disabled={isUploading}
        onChange={handleFileChange}
      />

      <Button
        onClick={() => fileInputRef.current?.click()}
        disabled={isUploading}
        className="gap-2"
        variant="default"
      >
        <UploadCloud className="h-4 w-4" />
        {isUploading ? 'Uploading...' : 'Choose Files'}
      </Button>
    </div>
  );
}