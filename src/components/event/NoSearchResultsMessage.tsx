// components/events/NoSearchResultsMessage.tsx

import { SearchIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface NoSearchResultsMessageProps {
  onClearFilters: () => void;
}

export const NoSearchResultsMessage = ({ onClearFilters }: NoSearchResultsMessageProps) => {
  return (
    <div className="text-center py-12">
      <div className="bg-gray-100 mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-4">
        <SearchIcon className="h-8 w-8 text-gray-400" />
      </div>
      <h3 className="text-xl font-medium text-gray-700 mb-2">No events found</h3>
      <p className="text-gray-500 max-w-md mx-auto mb-6">
        We couldn't find any events matching your search criteria. Try adjusting your filters or search terms.
      </p>
      <Button
        variant="outline"
        onClick={onClearFilters}
      >
        Clear Filters
      </Button>
    </div>
  );
};