import { XIcon } from "lucide-react";
import { Button } from "../ui/button";

export const SharedWelcomeBanner = ({ event, onDismiss, status, isReturning }) => {
  if (!isSharedAccess || isReturning) return null;
  
  const getBannerContent = () => {
    if (status === 'pending') {
      return {
        title: 'Access Request Pending',
        message: 'Your request to join this event is awaiting approval from the host.',
        bgColor: 'bg-amber-50 border-amber-200',
        textColor: 'text-amber-800',
        icon: '⏳'
      };
    }
    
    return {
      title: `Welcome to ${event.name}!`,
      message: 'You can now view photos and participate in this event.',
      bgColor: 'bg-blue-50 border-blue-200',
      textColor: 'text-blue-800',
      icon: '🎉'
    };
  };
  
  const content = getBannerContent();
  
  return (
    <div className={`${content.bgColor} border-l-4 ${content.textColor} p-4 mb-6`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <span className="text-2xl mr-3">{content.icon}</span>
          <div>
            <h3 className="font-medium">{content.title}</h3>
            <p className="text-sm mt-1">{content.message}</p>
            {sharePermissions && (
              <div className="flex gap-2 mt-2">
                {sharePermissions.view && <Badge variant="outline">View Photos</Badge>}
                {sharePermissions.upload && <Badge variant="outline">Upload Photos</Badge>}
                {sharePermissions.download && <Badge variant="outline">Download</Badge>}
                {sharePermissions.comment && <Badge variant="outline">Comment</Badge>}
              </div>
            )}
          </div>
        </div>
        {showWelcome && (
          <Button variant="ghost" size="sm" onClick={onDismiss}>
            <XIcon className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
};