import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface PhotoInfoDialogProps {
  photo: any; // Replace 'any' with your actual Photo type
  open: boolean;
  onClose: () => void;
}

const PhotoInfoDialog: React.FC<PhotoInfoDialogProps> = ({ photo, open, onClose }) => {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Photo Information</DialogTitle>
        </DialogHeader>
        <pre className="whitespace-pre-wrap break-words">{JSON.stringify(photo, null, 2)}</pre>
      </DialogContent>
    </Dialog>
  );
};

export default PhotoInfoDialog;