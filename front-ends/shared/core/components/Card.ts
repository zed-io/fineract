/**
 * Core Card component interface
 * 
 * Defines the common properties and behavior for Card components
 * across frameworks.
 */

export enum CardVariant {
  DEFAULT = 'default',
  OUTLINE = 'outline',
  ELEVATED = 'elevated',
  FLAT = 'flat',
}

export interface CardProps {
  /** Card title */
  title?: string;
  
  /** Card subtitle */
  subtitle?: string;
  
  /** Card content */
  children: any;
  
  /** Card variant */
  variant?: CardVariant;
  
  /** Whether the card is clickable */
  clickable?: boolean;
  
  /** Click event handler (for clickable cards) */
  onClick?: () => void;
  
  /** Whether the card is disabled */
  disabled?: boolean;
  
  /** Whether the card has a shadow */
  shadow?: boolean;
  
  /** Whether the card has a hover effect */
  hoverable?: boolean;
  
  /** CSS class name for the card */
  className?: string;
  
  /** CSS class name for the card header */
  headerClassName?: string;
  
  /** CSS class name for the card body */
  bodyClassName?: string;
  
  /** CSS class name for the card footer */
  footerClassName?: string;
  
  /** Whether the card has a footer */
  hasFooter?: boolean;
  
  /** Footer content */
  footer?: any;
  
  /** Custom icon or image to display in the header */
  headerIcon?: any;
  
  /** CSS class name for the header icon */
  headerIconClassName?: string;
  
  /** CSS class name for the card title */
  titleClassName?: string;
  
  /** CSS class name for the card subtitle */
  subtitleClassName?: string;
  
  /** Whether to have full height (flex-grow: 1) */
  fullHeight?: boolean;
  
  /** Custom styles for the card */
  style?: Record<string, any>;
  
  /** Border radius size */
  borderRadius?: 'none' | 'small' | 'medium' | 'large' | 'full';
  
  /** Horizontal alignment of the content */
  align?: 'left' | 'center' | 'right';
  
  /** Card padding size */
  padding?: 'none' | 'small' | 'medium' | 'large';
  
  /** Whether to show a divider between header and body */
  headerDivider?: boolean;
  
  /** Whether to show a divider between body and footer */
  footerDivider?: boolean;
  
  /** Custom header content (overrides title and subtitle) */
  customHeader?: any;
  
  /** ID attribute for the card */
  id?: string;
  
  /** ARIA role for the card */
  role?: string;
  
  /** Background color */
  backgroundColor?: string;
  
  /** Whether the card is compact */
  compact?: boolean;
}

/**
 * Default Card property values
 */
export const defaultCardProps: Partial<CardProps> = {
  variant: CardVariant.DEFAULT,
  clickable: false,
  disabled: false,
  shadow: true,
  hoverable: false,
  hasFooter: false,
  fullHeight: false,
  borderRadius: 'medium',
  align: 'left',
  padding: 'medium',
  headerDivider: false,
  footerDivider: true,
  compact: false,
};

/**
 * Common Card style guidelines
 */
export const cardStyleGuidelines = {
  card: {
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: '#ffffff',
    overflow: 'hidden',
    border: '1px solid transparent',
    position: 'relative',
  },
  
  variants: {
    [CardVariant.DEFAULT]: {
      borderColor: '#e2e8f0', // slate-200
    },
    [CardVariant.OUTLINE]: {
      borderColor: '#cbd5e1', // slate-300
      boxShadow: 'none',
    },
    [CardVariant.ELEVATED]: {
      borderColor: 'transparent',
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    },
    [CardVariant.FLAT]: {
      borderColor: 'transparent',
      boxShadow: 'none',
    },
  },
  
  borderRadius: {
    none: '0',
    small: '0.25rem',
    medium: '0.5rem',
    large: '0.75rem',
    full: '1rem',
  },
  
  padding: {
    none: '0',
    small: '0.75rem',
    medium: '1rem',
    large: '1.5rem',
  },
  
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  
  headerTitle: {
    flex: 1,
  },
  
  title: {
    margin: '0',
    fontSize: '1.25rem',
    fontWeight: 'bold',
    color: '#334155', // slate-700
  },
  
  subtitle: {
    margin: '0.25rem 0 0 0',
    fontSize: '0.875rem',
    color: '#64748b', // slate-500
  },
  
  headerIcon: {
    marginRight: '0.75rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  body: {
    flex: 1,
  },
  
  divider: {
    borderTop: '1px solid #e2e8f0', // slate-200
    margin: '0',
  },
  
  footer: {
    display: 'flex',
    alignItems: 'center',
  },
  
  clickable: {
    cursor: 'pointer',
    transition: 'transform 0.2s, box-shadow 0.2s',
    '&:hover': {
      transform: 'translateY(-2px)',
      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
    },
    '&:active': {
      transform: 'translateY(0)',
    },
  },
  
  hoverable: {
    transition: 'transform 0.2s, box-shadow 0.2s',
    '&:hover': {
      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
    },
  },
  
  disabled: {
    opacity: 0.6,
    cursor: 'not-allowed',
    pointerEvents: 'none',
  },
  
  fullHeight: {
    height: '100%',
  },
  
  compact: {
    '& $title': {
      fontSize: '1rem',
    },
    '& $subtitle': {
      fontSize: '0.75rem',
    },
  },
};