/**
 * Core Alert component interface
 * 
 * Defines the common properties and behavior for Alert components
 * across frameworks.
 */

export enum AlertVariant {
  INFO = 'info',
  SUCCESS = 'success',
  WARNING = 'warning',
  ERROR = 'error',
  DEFAULT = 'default',
}

export interface AlertProps {
  /** Alert title */
  title?: string;
  
  /** Alert content */
  children: any;
  
  /** Alert variant */
  variant?: AlertVariant;
  
  /** Whether the alert is dismissible */
  dismissible?: boolean;
  
  /** Handler for dismiss event */
  onDismiss?: () => void;
  
  /** CSS class name for the alert */
  className?: string;
  
  /** CSS class name for the alert title */
  titleClassName?: string;
  
  /** CSS class name for the alert content */
  contentClassName?: string;
  
  /** CSS class name for the alert icon */
  iconClassName?: string;
  
  /** Custom icon to display */
  icon?: any;
  
  /** Whether to show the default icon */
  showIcon?: boolean;
  
  /** Border radius */
  borderRadius?: 'none' | 'small' | 'medium' | 'large' | 'full';
  
  /** Whether the alert has a border */
  bordered?: boolean;
  
  /** Whether the alert has a shadow */
  shadow?: boolean;
  
  /** Horizontal alignment of the content */
  align?: 'left' | 'center' | 'right';
  
  /** Alert padding size */
  padding?: 'small' | 'medium' | 'large';
  
  /** Custom styles for the alert */
  style?: Record<string, any>;
  
  /** ID attribute for the alert */
  id?: string;
  
  /** ARIA role for the alert */
  role?: string;
  
  /** Whether the alert is outlined */
  outlined?: boolean;
  
  /** Whether the alert is filled */
  filled?: boolean;
  
  /** Action button text */
  actionText?: string;
  
  /** Action button handler */
  onAction?: () => void;
  
  /** Whether the action button is disabled */
  actionDisabled?: boolean;
  
  /** Duration in milliseconds before auto-dismissing (0 means no auto-dismiss) */
  autoDismissDuration?: number;
}

/**
 * Default Alert property values
 */
export const defaultAlertProps: Partial<AlertProps> = {
  variant: AlertVariant.INFO,
  dismissible: false,
  showIcon: true,
  borderRadius: 'medium',
  bordered: true,
  shadow: false,
  align: 'left',
  padding: 'medium',
  outlined: false,
  filled: false,
  role: 'alert',
  actionDisabled: false,
  autoDismissDuration: 0,
};

/**
 * Common Alert style guidelines
 */
export const alertStyleGuidelines = {
  alert: {
    display: 'flex',
    alignItems: 'flex-start',
    backgroundColor: '#ffffff',
    position: 'relative',
    overflow: 'hidden',
  },
  
  variants: {
    [AlertVariant.INFO]: {
      backgroundColor: '#ebf5ff', // light blue
      borderColor: '#90cdf4', // blue-300
      color: '#3182ce', // blue-600
    },
    [AlertVariant.SUCCESS]: {
      backgroundColor: '#f0fff4', // light green
      borderColor: '#9ae6b4', // green-300
      color: '#38a169', // green-600
    },
    [AlertVariant.WARNING]: {
      backgroundColor: '#fffaf0', // light orange
      borderColor: '#fbd38d', // orange-300
      color: '#ed8936', // orange-600
    },
    [AlertVariant.ERROR]: {
      backgroundColor: '#fff5f5', // light red
      borderColor: '#feb2b2', // red-300
      color: '#e53e3e', // red-600
    },
    [AlertVariant.DEFAULT]: {
      backgroundColor: '#f8fafc', // slate-50
      borderColor: '#e2e8f0', // slate-200
      color: '#64748b', // slate-500
    },
  },
  
  filled: {
    [AlertVariant.INFO]: {
      backgroundColor: '#3182ce', // blue-600
      color: '#ffffff',
    },
    [AlertVariant.SUCCESS]: {
      backgroundColor: '#38a169', // green-600
      color: '#ffffff',
    },
    [AlertVariant.WARNING]: {
      backgroundColor: '#ed8936', // orange-600
      color: '#ffffff',
    },
    [AlertVariant.ERROR]: {
      backgroundColor: '#e53e3e', // red-600
      color: '#ffffff',
    },
    [AlertVariant.DEFAULT]: {
      backgroundColor: '#64748b', // slate-500
      color: '#ffffff',
    },
  },
  
  outlined: {
    backgroundColor: 'transparent',
  },
  
  borderRadius: {
    none: '0',
    small: '0.25rem',
    medium: '0.5rem',
    large: '0.75rem',
    full: '1rem',
  },
  
  padding: {
    small: '0.5rem 0.75rem',
    medium: '0.75rem 1rem',
    large: '1rem 1.25rem',
  },
  
  bordered: {
    borderWidth: '1px',
    borderStyle: 'solid',
  },
  
  shadow: {
    boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
  },
  
  icon: {
    marginRight: '0.75rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  
  content: {
    flex: 1,
  },
  
  title: {
    fontWeight: 'bold',
    fontSize: '1rem',
    marginTop: 0,
    marginBottom: '0.25rem',
  },
  
  dismissButton: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '0.25rem',
    marginLeft: '0.75rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.7,
    '&:hover': {
      opacity: 1,
    },
  },
  
  action: {
    marginTop: '0.5rem',
  },
};