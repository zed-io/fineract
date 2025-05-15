/**
 * Core Button component interface
 * 
 * This defines the common properties and behavior that all button implementations
 * should support, regardless of framework.
 */

export enum ButtonVariant {
  DEFAULT = 'default',
  PRIMARY = 'primary',
  SECONDARY = 'secondary',
  OUTLINE = 'outline',
  GHOST = 'ghost',
  LINK = 'link',
  DESTRUCTIVE = 'destructive',
}

export enum ButtonSize {
  SMALL = 'small',
  MEDIUM = 'medium',
  LARGE = 'large',
}

export interface ButtonProps {
  /** The text content of the button */
  label: string;
  
  /** Optional icon to display (icon name or component reference) */
  icon?: string | any;
  
  /** Position of the icon relative to the label */
  iconPosition?: 'left' | 'right';
  
  /** Button style variant */
  variant?: ButtonVariant;
  
  /** Button size */
  size?: ButtonSize;
  
  /** Whether the button is disabled */
  disabled?: boolean;
  
  /** Whether the button shows a loading state */
  loading?: boolean;
  
  /** Full width button */
  fullWidth?: boolean;
  
  /** Type of button (submit, button, reset) */
  type?: 'submit' | 'button' | 'reset';
  
  /** Click event handler */
  onClick?: (event: any) => void;
  
  /** Additional class names */
  className?: string;
  
  /** Additional style object */
  style?: Record<string, any>;
  
  /** Any additional properties */
  [key: string]: any;
}

/**
 * Default button property values
 */
export const defaultButtonProps: Partial<ButtonProps> = {
  variant: ButtonVariant.DEFAULT,
  size: ButtonSize.MEDIUM,
  iconPosition: 'left',
  disabled: false,
  loading: false,
  fullWidth: false,
  type: 'button',
};

/**
 * Common button style guidelines
 * These can be used as a reference for implementing framework-specific buttons
 */
export const buttonStyleGuidelines = {
  // Base button styles
  base: {
    fontWeight: 'medium',
    borderRadius: '0.375rem', // 6px
    transition: 'all 0.2s',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    lineHeight: '1.5',
  },
  
  // Button sizes
  sizes: {
    [ButtonSize.SMALL]: {
      fontSize: '0.875rem', // 14px
      padding: '0.375rem 0.75rem', // 6px 12px
      height: '2rem', // 32px
    },
    [ButtonSize.MEDIUM]: {
      fontSize: '0.9375rem', // 15px
      padding: '0.5rem 1rem', // 8px 16px
      height: '2.5rem', // 40px
    },
    [ButtonSize.LARGE]: {
      fontSize: '1rem', // 16px
      padding: '0.625rem 1.25rem', // 10px 20px
      height: '3rem', // 48px
    },
  },
  
  // Button variants
  variants: {
    [ButtonVariant.DEFAULT]: {
      backgroundColor: '#f8fafc', // slate-50
      color: '#334155', // slate-700
      border: '1px solid #e2e8f0', // slate-200
      hoverBackgroundColor: '#f1f5f9', // slate-100
      activeBackgroundColor: '#e2e8f0', // slate-200
    },
    [ButtonVariant.PRIMARY]: {
      backgroundColor: '#4fa2db', // mifos primary
      color: '#ffffff',
      border: 'none',
      hoverBackgroundColor: '#3e95cf',
      activeBackgroundColor: '#3888c2',
    },
    [ButtonVariant.SECONDARY]: {
      backgroundColor: '#5e819d', // mifos secondary
      color: '#ffffff',
      border: 'none',
      hoverBackgroundColor: '#526f89',
      activeBackgroundColor: '#465f74',
    },
    [ButtonVariant.OUTLINE]: {
      backgroundColor: 'transparent',
      color: '#4fa2db', // mifos primary
      border: '1px solid #4fa2db',
      hoverBackgroundColor: 'rgba(79, 162, 219, 0.1)',
      activeBackgroundColor: 'rgba(79, 162, 219, 0.2)',
    },
    [ButtonVariant.GHOST]: {
      backgroundColor: 'transparent',
      color: '#334155', // slate-700
      border: 'none',
      hoverBackgroundColor: 'rgba(241, 245, 249, 0.8)', // slate-100
      activeBackgroundColor: 'rgba(226, 232, 240, 0.8)', // slate-200
    },
    [ButtonVariant.LINK]: {
      backgroundColor: 'transparent',
      color: '#4fa2db', // mifos primary
      border: 'none',
      hoverBackgroundColor: 'transparent',
      activeBackgroundColor: 'transparent',
      hoverTextDecoration: 'underline',
    },
    [ButtonVariant.DESTRUCTIVE]: {
      backgroundColor: '#e74c3c', // mifos danger
      color: '#ffffff',
      border: 'none',
      hoverBackgroundColor: '#d44637',
      activeBackgroundColor: '#c0392b',
    },
  },
  
  // States
  states: {
    disabled: {
      opacity: 0.5,
      cursor: 'not-allowed',
    },
    loading: {
      cursor: 'wait',
    },
    fullWidth: {
      width: '100%',
    },
  },
};