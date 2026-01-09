export const colors = {
  background: {
    app: '#ECF1F6',
    card: '#FFFFFF',
    cardMuted: '#F4F7FA',
    cardAccent: '#E8EEF4',
  },
  primary: {
    50: '#E8EEF4',
    100: '#D1DEE9',
    500: '#1F4F6B',
    600: '#0F2A4D',
    700: '#0A1E38',
  },
  accent: {
    50: '#E6F4F6',
    100: '#C2E5EA',
    500: '#218C9C',
    600: '#1A7080',
    700: '#145664',
  },
  status: {
    pending: {
      bg: '#FEF7E8',
      text: '#B5751D',
      border: '#D4A34A',
    },
    active: {
      bg: '#E8F5F0',
      text: '#2D7A5E',
      border: '#48A37E',
    },
    rejected: {
      bg: '#FBE9E9',
      text: '#B54242',
      border: '#D66666',
    },
  },
  text: {
    primary: '#1A2B3C',
    secondary: '#4A5C6D',
    muted: '#7A8B9C',
  },
  border: {
    light: '#D6DEE6',
    medium: '#B8C4D0',
  },
  divider: '#A7B4C2',
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
  header: '0 2px 8px 0 rgb(0 0 0 / 0.12)',
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
