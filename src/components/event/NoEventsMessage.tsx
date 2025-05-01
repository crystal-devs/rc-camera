// components/events/NoEventsMessage.tsx

import { CalendarIcon, PlusIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface NoEventsMessageProps {
  onCreateEvent: () => void;
}

export const NoEventsMessage = ({ onCreateEvent }: NoEventsMessageProps) => {
  return (
    <div className="text-center py-12">
      <div className="bg-gray-100 mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-4">
        <CalendarIcon className="h-8 w-8 text-gray-400" />
      </div>
      <h3 className="text-xl font-medium text-gray-700 mb-2">No events yet</h3>
      <p className="text-gray-500 max-w-md mx-auto mb-6">
        You haven't created any events yet. Create your first event to start collecting photos!
      </p>
      <Button onClick={onCreateEvent}>
        <PlusIcon className="h-4 w-4 mr-2" />
        Create First Event
      </Button>
    </div>
  );
};