// components/ui/NotificationBanner.tsx - Responsive notification banner
'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { X, RefreshCw, Eye } from 'lucide-react';

interface NotificationBannerProps {
  message: string;
  count?: number;
  type?: 'info' | 'success' | 'warning';
  onAction?: () => void;
  onDismiss?: () => void;
  actionLabel?: string;
  isVisible: boolean;
  position?: 'top' | 'bottom';
}

export const NotificationBanner: React.FC<NotificationBannerProps> = ({
  message,
  count,
  type = 'info',
  onAction,
  onDismiss,
  actionLabel = 'View',
  isVisible,
  position = 'top'
}) => {
  if (!isVisible) return null;

  const getTypeStyles = () => {
    switch (type) {
      case 'success':
        return 'bg-green-500/90 border-green-600 text-white';
      case 'warning':
        return 'bg-orange-500/90 border-orange-600 text-white';
      default:
        return 'bg-blue-500/90 border-blue-600 text-white';
    }
  };

  const positionClasses = position === 'top' 
    ? 'top-4' 
    : 'bottom-4';

  return (
    <div className={`fixed left-4 right-4 ${positionClasses} z-50 animate-in slide-in-from-top-2 duration-300`}>
      <div className={`
        ${getTypeStyles()} 
        backdrop-blur-sm border rounded-lg shadow-lg
        px-4 py-3 mx-auto max-w-md
        flex items-center justify-between gap-3
        md:max-w-lg lg:max-w-xl
      `}>
        {/* Message content */}
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Eye className="h-4 w-4 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">
              {message}
              {count && count > 0 && (
                <span className="ml-1 px-1.5 py-0.5 bg-white/20 rounded text-xs font-semibold">
                  {count}
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {onAction && (
            <Button
              size="sm"
              variant="secondary"
              onClick={onAction}
              className="h-7 px-3 text-xs bg-white/20 hover:bg-white/30 text-white border-0"
            >
              <RefreshCw className="h-3 w-3 mr-1" />
              {actionLabel}
            </Button>
          )}
          
          {onDismiss && (
            <Button
              size="sm"
              variant="ghost"
              onClick={onDismiss}
              className="h-7 w-7 p-0 text-white hover:bg-white/20"
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};