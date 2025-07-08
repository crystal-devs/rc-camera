import { useState, KeyboardEvent, useRef } from 'react';
import { X, Plus, Upload, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog';

interface GuestInputProps {
  guestList: string[];
  onChange: (guests: string[]) => void;
}

export function GuestInput({ guestList, onChange }: GuestInputProps) {
  const [inputValue, setInputValue] = useState('');
  const [bulkInputValue, setBulkInputValue] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const isValidEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const addGuest = (email: string) => {
    const trimmedEmail = email.trim().toLowerCase();
    
    // Don't add if empty
    if (!trimmedEmail) return;
    
    // Validate email format
    if (!isValidEmail(trimmedEmail)) {
      toast.error('Please enter a valid email address');
      return;
    }
    
    // Check for duplicates
    if (guestList.includes(trimmedEmail)) {
      toast.info('This guest has already been added');
      return;
    }
    
    // Add the new guest to the list
    onChange([...guestList, trimmedEmail]);
    
    // Clear the input field
    setInputValue('');
    
    // Focus back on the input
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const removeGuest = (emailToRemove: string) => {
    onChange(guestList.filter(email => email !== emailToRemove));
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    // Add guest on Enter or comma
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addGuest(inputValue);
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    // Handle pasting multiple emails
    e.preventDefault();
    const pastedText = e.clipboardData.getData('text');
    const emails = pastedText.split(/[,;\s]+/); // Split by commas, semicolons, or whitespace
    
    // Filter valid emails and add them
    const validEmails = emails.filter(email => email.trim() && isValidEmail(email.trim()));
    const uniqueEmails = validEmails.filter(email => !guestList.includes(email.trim().toLowerCase()));
    
    if (uniqueEmails.length > 0) {
      onChange([...guestList, ...uniqueEmails.map(email => email.trim().toLowerCase())]);
    }
    
    if (validEmails.length !== emails.filter(email => email.trim()).length) {
      toast.warning('Some email addresses were not valid and were not added');
    }
    
    if (uniqueEmails.length > 0) {
      toast.success(`Added ${uniqueEmails.length} new guest${uniqueEmails.length === 1 ? '' : 's'}`);
    }
  };
  
  const handleBulkImport = () => {
    if (!bulkInputValue.trim()) {
      setIsDialogOpen(false);
      return;
    }
    
    const emails = bulkInputValue
      .split(/[,;\n\s]+/) // Split by commas, semicolons, newlines, or spaces
      .map(email => email.trim().toLowerCase())
      .filter(email => email && isValidEmail(email)); // Filter valid emails
      
    // Filter out duplicates
    const uniqueEmails = emails.filter(email => !guestList.includes(email));
    
    if (uniqueEmails.length > 0) {
      onChange([...guestList, ...uniqueEmails]);
      
      // Show success message
      toast.success(`Added ${uniqueEmails.length} guest${uniqueEmails.length === 1 ? '' : 's'}`);
    } else if (emails.length > 0) {
      toast.info('All these guests were already added');
    } else {
      toast.error('No valid email addresses found');
    }
    
    // Reset and close dialog
    setBulkInputValue('');
    setIsDialogOpen(false);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center space-x-2">
        <Input
          ref={inputRef}
          type="email"
          placeholder="Enter guest email and press Enter"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          className="flex-grow"
        />
        <Button 
          type="button" 
          size="sm" 
          onClick={() => addGuest(inputValue)}
          disabled={!inputValue.trim()}
        >
          <Plus className="h-4 w-4 mr-1" />
          Add
        </Button>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button type="button" size="sm" variant="outline">
              <Upload className="h-4 w-4 mr-1" />
              Bulk Add
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Bulk Add Guests</DialogTitle>
              <DialogDescription>
                Add multiple guests at once. Enter one email per line or separate them with commas.
              </DialogDescription>
            </DialogHeader>
            
            <div className="py-4">
              <Textarea
                placeholder="guest1@example.com, guest2@example.com&#10;guest3@example.com"
                value={bulkInputValue}
                onChange={(e) => setBulkInputValue(e.target.value)}
                className="min-h-[150px]"
              />
            </div>
            
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="button" onClick={handleBulkImport}>
                <Users className="h-4 w-4 mr-1" />
                Add Guests
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      
      {guestList.length > 0 ? (
        <>
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium">
              {guestList.length} {guestList.length === 1 ? 'guest' : 'guests'} invited
            </div>
            {guestList.length > 0 && (
              <Button 
                type="button" 
                size="sm" 
                variant="ghost" 
                className="text-xs text-red-500 hover:text-red-700"
                onClick={() => {
                  if (confirm('Are you sure you want to remove all guests?')) {
                    onChange([]);
                  }
                }}
              >
                Clear All
              </Button>
            )}
          </div>
          
          <div className="flex flex-wrap gap-2 mt-2 max-h-[200px] overflow-y-auto p-2 border rounded-md">
            {guestList.map((email, index) => (
              <Badge key={index} variant="secondary" className="px-2 py-1 flex items-center gap-1">
                {email}
                <button 
                  type="button" 
                  onClick={() => removeGuest(email)}
                  className="ml-1 rounded-full hover:bg-gray-200 p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        </>
      ) : (
        <div className="text-xs text-gray-500 mt-2">
          Add guests by typing their email and pressing Enter, or use Bulk Add for multiple guests
        </div>
      )}
    </div>
  );
}
