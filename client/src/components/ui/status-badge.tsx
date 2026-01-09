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
    className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  },
  active: {
    label: 'Active',
    labelAr: 'نشط',
    icon: CheckCircle2,
    className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  },
  rejected: {
    label: 'Rejected',
    labelAr: 'مرفوض',
    icon: XCircle,
    className: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
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
