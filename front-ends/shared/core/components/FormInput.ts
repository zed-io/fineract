/**
 * Core FormInput component interface
 * 
 * Defines the common properties and behavior for form input components
 * across frameworks.
 */

export enum InputType {
  TEXT = 'text',
  PASSWORD = 'password',
  EMAIL = 'email',
  NUMBER = 'number',
  TEL = 'tel',
  URL = 'url',
  DATE = 'date',
  TIME = 'time',
  DATETIME = 'datetime-local',
  TEXTAREA = 'textarea',
  SELECT = 'select',
  CHECKBOX = 'checkbox',
  RADIO = 'radio',
  FILE = 'file',
  HIDDEN = 'hidden',
  COLOR = 'color',
  RANGE = 'range',
}

export enum InputSize {
  SMALL = 'small',
  MEDIUM = 'medium',
  LARGE = 'large',
}

export interface InputValidation {
  /** Whether the input has been touched (focused and blurred) */
  touched?: boolean;
  
  /** Whether the input is valid */
  valid?: boolean;
  
  /** Error message to display (if any) */
  error?: string;
  
  /** Validation rules */
  rules?: {
    /** Whether the field is required */
    required?: boolean;
    
    /** Minimum length (for text inputs) */
    minLength?: number;
    
    /** Maximum length (for text inputs) */
    maxLength?: number;
    
    /** Minimum value (for number inputs) */
    min?: number;
    
    /** Maximum value (for number inputs) */
    max?: number;
    
    /** RegExp pattern to match (for text inputs) */
    pattern?: string | RegExp;
    
    /** Custom validation function */
    custom?: (value: any) => boolean | string;
  };
}

export interface SelectOption {
  /** Option value */
  value: string | number | boolean;
  
  /** Option text to display */
  label: string;
  
  /** Whether the option is disabled */
  disabled?: boolean;
  
  /** Optional group this option belongs to */
  group?: string;
  
  /** Any additional data for this option */
  [key: string]: any;
}

export interface FormInputProps {
  /** Input name attribute */
  name: string;
  
  /** Input type */
  type: InputType;
  
  /** Input value */
  value: any;
  
  /** Change event handler */
  onChange: (value: any, event?: any) => void;
  
  /** Input label */
  label?: string;
  
  /** Placeholder text */
  placeholder?: string;
  
  /** Whether the input is disabled */
  disabled?: boolean;
  
  /** Whether the input is read-only */
  readOnly?: boolean;
  
  /** Input size variant */
  size?: InputSize;
  
  /** Whether the input is required */
  required?: boolean;
  
  /** Input validation configuration */
  validation?: InputValidation;
  
  /** Blur event handler */
  onBlur?: (event: any) => void;
  
  /** Focus event handler */
  onFocus?: (event: any) => void;
  
  /** Key press event handler */
  onKeyPress?: (event: any) => void;
  
  /** Key down event handler */
  onKeyDown?: (event: any) => void;
  
  /** Key up event handler */
  onKeyUp?: (event: any) => void;
  
  /** CSS class name */
  className?: string;
  
  /** Whether to auto-focus this input */
  autoFocus?: boolean;
  
  /** Input ID attribute */
  id?: string;
  
  /** Help text to display below the input */
  helpText?: string;
  
  /** Prefix content to display inside the input (icon, text) */
  prefix?: any;
  
  /** Suffix content to display inside the input (icon, text) */
  suffix?: any;
  
  /** Whether to wrap the input with a form group */
  formGroup?: boolean;
  
  /** CSS class name for the label */
  labelClassName?: string;
  
  /** CSS class name for the input */
  inputClassName?: string;
  
  /** CSS class name for the error message */
  errorClassName?: string;
  
  /** CSS class name for the help text */
  helpTextClassName?: string;
  
  /** Tab index */
  tabIndex?: number;
  
  /** ARIA label */
  ariaLabel?: string;
  
  /** ARIA described by */
  ariaDescribedBy?: string;
  
  /** Input mode hint for browsers */
  inputMode?: 'none' | 'text' | 'decimal' | 'numeric' | 'tel' | 'search' | 'email' | 'url';
  
  /** Options for select inputs */
  options?: SelectOption[];
  
  /** Whether to allow multiple selections (for select inputs) */
  multiple?: boolean;
  
  /** Maximum number of selections (for multiple select) */
  maxSelections?: number;
  
  /** Whether to show a clear button */
  clearable?: boolean;
  
  /** Whether to show a search box (for select inputs) */
  searchable?: boolean;
  
  /** Maximum file size in bytes (for file inputs) */
  maxFileSize?: number;
  
  /** Accepted file types (for file inputs) */
  accept?: string;
  
  /** Number of rows (for textarea inputs) */
  rows?: number;
  
  /** Number of columns (for textarea inputs) */
  cols?: number;
  
  /** Whether to auto-resize textarea to fit content */
  autoResize?: boolean;
  
  /** Maximum height for auto-resize textareas */
  maxHeight?: number;
  
  /** Step value for number inputs */
  step?: number | string;
}

/**
 * Default FormInput property values
 */
export const defaultFormInputProps: Partial<FormInputProps> = {
  type: InputType.TEXT,
  size: InputSize.MEDIUM,
  disabled: false,
  readOnly: false,
  required: false,
  formGroup: true,
  autoFocus: false,
  clearable: false,
  searchable: false,
  autoResize: false,
  rows: 3,
  step: 'any',
};

/**
 * Common FormInput style guidelines
 */
export const formInputStyleGuidelines = {
  formGroup: {
    marginBottom: '1rem',
  },
  
  label: {
    display: 'block',
    marginBottom: '0.5rem',
    fontSize: '0.875rem',
    fontWeight: '500',
    color: '#334155', // slate-700
  },
  
  input: {
    display: 'block',
    width: '100%',
    borderRadius: '0.375rem',
    borderWidth: '1px',
    borderColor: '#cbd5e1', // slate-300
    padding: '0.5rem 0.75rem',
    fontSize: '0.875rem',
    lineHeight: '1.25rem',
    color: '#334155', // slate-700
    backgroundColor: '#ffffff',
    transition: 'border-color 0.15s ease-in-out, box-shadow 0.15s ease-in-out',
    
    '&:focus': {
      outline: 'none',
      borderColor: '#4fa2db', // mifos primary
      boxShadow: '0 0 0 3px rgba(79, 162, 219, 0.15)',
    },
    
    '&:disabled': {
      backgroundColor: '#f1f5f9', // slate-100
      opacity: 0.7,
      cursor: 'not-allowed',
    },
  },
  
  sizes: {
    [InputSize.SMALL]: {
      padding: '0.25rem 0.5rem',
      fontSize: '0.75rem',
      borderRadius: '0.25rem',
    },
    [InputSize.MEDIUM]: {
      padding: '0.5rem 0.75rem',
      fontSize: '0.875rem',
      borderRadius: '0.375rem',
    },
    [InputSize.LARGE]: {
      padding: '0.75rem 1rem',
      fontSize: '1rem',
      borderRadius: '0.5rem',
    },
  },
  
  error: {
    width: '100%',
    marginTop: '0.25rem',
    fontSize: '0.75rem',
    color: '#e74c3c', // mifos danger
  },
  
  helpText: {
    display: 'block',
    marginTop: '0.25rem',
    fontSize: '0.75rem',
    color: '#64748b', // slate-500
  },
  
  checkbox: {
    display: 'inline-flex',
    alignItems: 'center',
    
    '& input': {
      marginRight: '0.5rem',
      height: '1rem',
      width: '1rem',
    }
  },
  
  radio: {
    display: 'inline-flex',
    alignItems: 'center',
    
    '& input': {
      marginRight: '0.5rem',
      height: '1rem',
      width: '1rem',
    }
  },
  
  select: {
    width: '100%',
    appearance: 'none',
    backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='none'%3e%3cpath d='M7 7l3-3 3 3m0 6l-3 3-3-3' stroke='%239fa6b2' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3e%3c/svg%3e")`,
    backgroundPosition: 'right 0.5rem center',
    backgroundRepeat: 'no-repeat',
    backgroundSize: '1.5em 1.5em',
    paddingRight: '2.5rem',
  },
  
  inputWithIcon: {
    position: 'relative',
  },
  
  prefix: {
    position: 'absolute',
    top: '50%',
    left: '0.75rem',
    transform: 'translateY(-50%)',
    color: '#64748b', // slate-500
    display: 'flex',
    alignItems: 'center',
    pointerEvents: 'none',
  },
  
  suffix: {
    position: 'absolute',
    top: '50%',
    right: '0.75rem',
    transform: 'translateY(-50%)',
    color: '#64748b', // slate-500
    display: 'flex',
    alignItems: 'center',
  },
  
  inputWithPrefix: {
    paddingLeft: '2.5rem',
  },
  
  inputWithSuffix: {
    paddingRight: '2.5rem',
  },
  
  clearButton: {
    background: 'none',
    border: 'none',
    padding: '0',
    margin: '0',
    cursor: 'pointer',
    fontSize: '1rem',
    color: '#64748b', // slate-500
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  fileInput: {
    padding: '0.375rem 0.75rem',
  },
  
  textareaAutoResize: {
    overflow: 'hidden',
    resize: 'none',
    minHeight: '80px',
  },
};