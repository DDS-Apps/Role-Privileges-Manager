import { Clock, CheckCircle2, XCircle } from "lucide-react";

type StatusType = 'pending' | 'active' | 'rejected';

interface StatusBadgeProps {
  status: StatusType;
  size?: 'sm' | 'md';
}

const statusConfig = {
  pending: {
    label: 'Pending',
    labelAr: 'قيد الانتظار',
    icon: Clock,
    className: 'bg-amber-50 text-amber-800 border border-amber-200 dark:bg-amber-950/50 dark:text-amber-200 dark:border-amber-800',
  },
  active: {
    label: 'Approved',
    labelAr: 'معتمد',
    icon: CheckCircle2,
    className: 'bg-teal-50 text-teal-800 border border-teal-200 dark:bg-teal-950/50 dark:text-teal-200 dark:border-teal-800',
  },
  rejected: {
    label: 'Rejected',
    labelAr: 'مرفوض',
    icon: XCircle,
    className: 'bg-rose-50 text-rose-800 border border-rose-200 dark:bg-rose-950/50 dark:text-rose-200 dark:border-rose-800',
  },
};

export function StatusBadge({ status, size = 'md' }: StatusBadgeProps) {
  const config = statusConfig[status];
  const Icon = config.icon;
  const isRtl = document.documentElement.dir === 'rtl';
  
  const sizeClasses = size === 'sm' 
    ? 'px-2 py-0.5 text-xs gap-1' 
    : 'px-2.5 py-1 text-sm gap-1.5';
  const iconSize = size === 'sm' ? 'h-3 w-3' : 'h-3.5 w-3.5';

  return (
    <span 
      className={`inline-flex items-center rounded-full font-medium ${sizeClasses} ${config.className}`}
      data-testid={`status-badge-${status}`}
    >
      <Icon className={iconSize} />
      <span>{isRtl ? config.labelAr : config.label}</span>
    </span>
  );
}
