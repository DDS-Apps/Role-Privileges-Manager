export const colors = {
  background: {
    app: '#F7F8FC',
    card: '#FFFFFF',
    cardMuted: '#F8FAFC',
    cardAccent: '#F0F4FF',
  },
  primary: {
    50: '#EEF2FF',
    100: '#E0E7FF',
    500: '#6366F1',
    600: '#4F46E5',
    700: '#4338CA',
  },
  status: {
    pending: {
      bg: '#FEF3C7',
      text: '#D97706',
      border: '#F59E0B',
    },
    active: {
      bg: '#D1FAE5',
      text: '#059669',
      border: '#10B981',
    },
    rejected: {
      bg: '#FEE2E2',
      text: '#DC2626',
      border: '#EF4444',
    },
  },
  text: {
    primary: '#1E293B',
    secondary: '#64748B',
    muted: '#94A3B8',
  },
  border: {
    light: '#E2E8F0',
    medium: '#CBD5E1',
  },
};

export const spacing = {
  xs: '4px',
  sm: '8px',
  md: '16px',
  lg: '24px',
  xl: '32px',
  '2xl': '48px',
};

export const borderRadius = {
  sm: '6px',
  md: '8px',
  lg: '12px',
  xl: '16px',
  full: '9999px',
};

export const shadows = {
  sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
  md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
  lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
  header: '0 2px 8px 0 rgb(0 0 0 / 0.1)',
};

export const typography = {
  title: {
    fontSize: '1.5rem',
    fontWeight: '700',
    lineHeight: '2rem',
  },
  subtitle: {
    fontSize: '1.125rem',
    fontWeight: '600',
    lineHeight: '1.75rem',
  },
  label: {
    fontSize: '0.875rem',
    fontWeight: '500',
    lineHeight: '1.25rem',
  },
  body: {
    fontSize: '0.875rem',
    fontWeight: '400',
    lineHeight: '1.5rem',
  },
  small: {
    fontSize: '0.75rem',
    fontWeight: '400',
    lineHeight: '1rem',
  },
};

export const getStatusStyles = (status: 'pending' | 'active' | 'rejected') => {
  const statusColors = colors.status[status];
  return {
    backgroundColor: statusColors.bg,
    color: statusColors.text,
    borderColor: statusColors.border,
  };
};
