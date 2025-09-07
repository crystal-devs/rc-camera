// components/StatusTabs.tsx
import { CircleCheckBig, ClockIcon, EyeOffIcon } from 'lucide-react';

interface StatusTabsProps {
  activeTab: 'approved' | 'pending' | 'rejected' | 'hidden';
  onTabChange: (tab: 'approved' | 'pending' | 'rejected' | 'hidden') => void;
  mediaCounts: {
    approved: number;
    pending: number;
    rejected: number;
    hidden: number;
    total: number;
  };
  userPermissions: {
    moderate: boolean;
  };
}

export const StatusTabs = ({
  activeTab,
  onTabChange,
  mediaCounts,
  userPermissions
}: StatusTabsProps) => {
  if (!userPermissions.moderate) return null;

  const tabs = [
    { key: 'approved', label: 'Published', icon: CircleCheckBig, color: 'green' },
    { key: 'pending', label: 'Pending', icon: ClockIcon, color: 'yellow' },
    // { key: 'rejected', label: 'Rejected', icon: null, color: 'red' },
    { key: 'hidden', label: 'Hidden', icon: EyeOffIcon, color: 'gray' }
  ] as const;

  return (
    <div className="flex items-center gap-1 bg-card p-1 rounded-lg border-1 border-border">
      {tabs.map(({ key, label, icon: Icon, color }) => (
        <button
          key={key}
          onClick={() => onTabChange(key)}
          className={`px-3 py-1.5 text-sm font-medium rounded-sm transition-colors flex items-center gap-1 ${activeTab === key
            ? 'bg-accent text-accent-foreground border-1 border-border'
            : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
        >
          {Icon && <Icon className={`px-1.5 py-0.5 text-xs rounded-full ${color === 'green' ? 'bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400' :
            color === 'yellow' ? 'bg-yellow-100 dark:bg-yellow-900 text-yellow-600 dark:text-yellow-400' :
                'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
            }`} />}
          {label}
          {mediaCounts[key] > 0 && (
            <span className={`ml-1 px-1.5 py-0.5 text-xs rounded-full ${color === 'green' ? 'bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400' :
              color === 'yellow' ? 'bg-yellow-100 dark:bg-yellow-900 text-yellow-600 dark:text-yellow-400' :
                'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
              }`}>
              {mediaCounts[key]}
            </span>
          )}
        </button>
      ))}
    </div>
  );
};