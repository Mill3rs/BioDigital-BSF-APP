export const Colors = {
  primary: '#1a5c2a',
  primaryLight: '#4caf50',
  primaryDark: '#0f3a19',
  accent: '#ff9800',
  accentLight: '#ffb74d',

  background: '#f0f4f0',
  surface: '#ffffff',
  surfaceAlt: '#f9fafb',

  textPrimary: '#1a1a1a',
  textSecondary: '#6b7280',
  textLight: '#9ca3af',
  textOnPrimary: '#ffffff',

  border: '#e5e7eb',
  borderLight: '#f3f4f6',

  success: '#22c55e',
  successLight: '#dcfce7',
  error: '#ef4444',
  errorLight: '#fee2e2',
  warning: '#f59e0b',
  warningLight: '#fef3c7',
  info: '#3b82f6',
  infoLight: '#dbeafe',

  // Status colours
  pending: '#f59e0b',
  active: '#22c55e',
  inactive: '#6b7280',
  suspended: '#ef4444',
  completed: '#3b82f6',
  cancelled: '#ef4444',
  processing: '#8b5cf6',
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const Radius = {
  sm: 6,
  md: 10,
  lg: 16,
  xl: 24,
  full: 9999,
};

export const Typography = {
  h1: { fontSize: 28, fontWeight: '700' as const },
  h2: { fontSize: 24, fontWeight: '700' as const },
  h3: { fontSize: 20, fontWeight: '600' as const },
  h4: { fontSize: 18, fontWeight: '600' as const },
  body1: { fontSize: 16, fontWeight: '400' as const },
  body2: { fontSize: 14, fontWeight: '400' as const },
  caption: { fontSize: 12, fontWeight: '400' as const },
  label: { fontSize: 13, fontWeight: '500' as const },
  button: { fontSize: 16, fontWeight: '600' as const },
};

export const Shadow = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 8,
  },
};
