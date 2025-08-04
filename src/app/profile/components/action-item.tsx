import { Button } from "@/components/ui/button";

export function ActionItem({
    label,
    count,
    icon,
    onClick,
    highlight = false
  }: {
    label: string;
    count?: number;
    icon?: React.ReactNode;
    onClick: () => void;
    highlight?: boolean;
  }) {
    return (
      <Button
        variant="ghost"
        className={`justify-start w-full ${highlight ? 'bg-muted/50' : ''}`}
        onClick={onClick}
      >
        {icon && <span className="mr-2">{icon}</span>}
        <span className="mr-auto">{label}</span>
        {count !== undefined && (
          <span className="bg-muted text-muted-foreground text-xs rounded-full px-2 py-0.5">
            {count}
          </span>
        )}
      </Button>
    );
  }