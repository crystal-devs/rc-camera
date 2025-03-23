// components/album/AlbumQR.tsx
import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Share2 } from 'lucide-react';

interface AlbumQRProps {
  albumId: string;
  accessCode: string;
}

export function AlbumQR({ albumId, accessCode }: AlbumQRProps) {
  const shareLink = `${window.location.origin}/join/${accessCode}`;
  
  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join my photo album',
          text: 'Capture and share photos in our album!',
          url: shareLink,
        });
      } catch (error) {
        console.error('Error sharing:', error);
      }
    } else {
      navigator.clipboard.writeText(shareLink);
    }
  };

  return (
    <Card className="w-full max-w-sm mx-auto">
      <CardContent className="pt-6 flex flex-col items-center">
        <div className="bg-white p-3 rounded-lg">
          <QRCodeSVG
            value={shareLink}
            size={200}
            includeMargin
            level="H"
          />
        </div>
        <p className="mt-4 text-sm text-center break-all">{shareLink}</p>
        <Button
          onClick={handleShare}
          className="mt-4 w-full"
          variant="outline"
        >
          <Share2 className="mr-2 h-4 w-4" />
          Share Link
        </Button>
      </CardContent>
    </Card>
  );
}
