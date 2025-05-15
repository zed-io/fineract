/**
 * Core Modal component interface
 * 
 * Defines the common properties and behavior for Modal implementations
 * across frameworks.
 */

export enum ModalSize {
  SMALL = 'small',
  MEDIUM = 'medium',
  LARGE = 'large',
  FULL = 'full',
}

export interface ModalProps {
  /** Whether the modal is visible */
  isOpen: boolean;
  
  /** Handler for when the modal is closed */
  onClose: () => void;
  
  /** Modal title */
  title?: string;
  
  /** Modal content */
  children: any;
  
  /** Modal size variant */
  size?: ModalSize;
  
  /** Whether to show a close button in the header */
  showCloseButton?: boolean;
  
  /** Text for the primary button (if any) */
  primaryButtonText?: string;
  
  /** Handler for the primary button */
  onPrimaryButtonClick?: () => void;
  
  /** Whether the primary button is disabled */
  primaryButtonDisabled?: boolean;
  
  /** Whether the primary button is in loading state */
  primaryButtonLoading?: boolean;
  
  /** Text for the secondary button (if any) */
  secondaryButtonText?: string;
  
  /** Handler for the secondary button */
  onSecondaryButtonClick?: () => void;
  
  /** Whether the secondary button is disabled */
  secondaryButtonDisabled?: boolean;
  
  /** CSS class name for the modal */
  className?: string;
  
  /** Whether to close the modal when clicking outside */
  closeOnClickOutside?: boolean;
  
  /** Whether to close the modal when pressing Escape */
  closeOnEscape?: boolean;
  
  /** Whether the modal has a backdrop */
  hasBackdrop?: boolean;
  
  /** Whether the backdrop is clickable */
  backdropClickable?: boolean;
  
  /** Whether to prevent scrolling of the background */
  preventBackgroundScrolling?: boolean;
  
  /** Whether the modal is centered vertically */
  centered?: boolean;
  
  /** Custom CSS styles for the modal */
  style?: Record<string, any>;
  
  /** Animation to use when opening/closing */
  animation?: 'fade' | 'slide' | 'scale' | 'none';
  
  /** Whether the modal has a footer */
  hasFooter?: boolean;
  
  /** Custom footer content */
  footer?: any;
  
  /** ID for the modal (for accessibility) */
  id?: string;
  
  /** ARIA description for the modal */
  ariaDescription?: string;
  
  /** ARIA label for the modal */
  ariaLabel?: string;
  
  /** Z-index for the modal */
  zIndex?: number;
}

/**
 * Default Modal property values
 */
export const defaultModalProps: Partial<ModalProps> = {
  size: ModalSize.MEDIUM,
  showCloseButton: true,
  closeOnClickOutside: true,
  closeOnEscape: true,
  hasBackdrop: true,
  backdropClickable: true,
  preventBackgroundScrolling: true,
  centered: true,
  animation: 'fade',
  hasFooter: true,
  zIndex: 1000,
};

/**
 * Common Modal style guidelines
 */
export const modalStyleGuidelines = {
  backdropBase: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    zIndex: 1000,
  },
  
  modalBase: {
    backgroundColor: '#ffffff',
    borderRadius: '0.5rem',
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
    display: 'flex',
    flexDirection: 'column',
    maxHeight: '90vh',
    overflow: 'hidden',
    position: 'relative',
    margin: 'auto',
  },
  
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  sizes: {
    [ModalSize.SMALL]: {
      width: '400px',
      maxWidth: '95%',
    },
    [ModalSize.MEDIUM]: {
      width: '600px',
      maxWidth: '95%',
    },
    [ModalSize.LARGE]: {
      width: '800px',
      maxWidth: '95%',
    },
    [ModalSize.FULL]: {
      width: '95%',
      height: '95%',
    },
  },
  
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '1rem',
    borderBottom: '1px solid #e2e8f0', // slate-200
  },
  
  title: {
    margin: 0,
    fontSize: '1.25rem',
    fontWeight: 'bold',
    color: '#334155', // slate-700
  },
  
  closeButton: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: '1.5rem',
    color: '#64748b', // slate-500
    padding: '0.25rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  content: {
    padding: '1rem',
    overflow: 'auto',
    flexGrow: 1,
  },
  
  footer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: '0.5rem',
    padding: '1rem',
    borderTop: '1px solid #e2e8f0', // slate-200
  },
  
  // Animation keyframes
  animations: {
    fade: {
      enter: {
        opacity: 0,
        transition: 'opacity 0.3s ease',
      },
      enterActive: {
        opacity: 1,
      },
      exit: {
        opacity: 1,
        transition: 'opacity 0.3s ease',
      },
      exitActive: {
        opacity: 0,
      },
    },
    
    scale: {
      enter: {
        transform: 'scale(0.7)',
        opacity: 0,
        transition: 'opacity 0.3s ease, transform 0.3s ease',
      },
      enterActive: {
        transform: 'scale(1)',
        opacity: 1,
      },
      exit: {
        transform: 'scale(1)',
        opacity: 1,
        transition: 'opacity 0.3s ease, transform 0.3s ease',
      },
      exitActive: {
        transform: 'scale(0.7)',
        opacity: 0,
      },
    },
    
    slide: {
      enter: {
        transform: 'translateY(50px)',
        opacity: 0,
        transition: 'opacity 0.3s ease, transform 0.3s ease',
      },
      enterActive: {
        transform: 'translateY(0)',
        opacity: 1,
      },
      exit: {
        transform: 'translateY(0)',
        opacity: 1,
        transition: 'opacity 0.3s ease, transform 0.3s ease',
      },
      exitActive: {
        transform: 'translateY(50px)',
        opacity: 0,
      },
    },
  },
};