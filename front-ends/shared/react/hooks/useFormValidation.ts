import { useState, useEffect, useCallback } from 'react';
import * as validationUtils from '../../utils/validation/common';
import * as financialValidation from '../../utils/validation/financial';

/**
 * Form field validation state
 */
export interface FieldValidation {
  /** Whether the field is valid */
  valid: boolean;
  
  /** Field error message */
  error?: string;
  
  /** Whether the field has been touched */
  touched: boolean;
  
  /** Whether the field is required */
  required: boolean;
}

/**
 * Form validation rules
 */
export interface ValidationRules {
  /** Whether the field is required */
  required?: boolean;
  
  /** Minimum length for string values */
  minLength?: number;
  
  /** Maximum length for string values */
  maxLength?: number;
  
  /** Regular expression pattern to match */
  pattern?: RegExp;
  
  /** Minimum value for number inputs */
  min?: number;
  
  /** Maximum value for number inputs */
  max?: number;
  
  /** Field should be an email */
  email?: boolean;
  
  /** Field should be a phone number */
  phone?: boolean;
  
  /** Field should be a positive number */
  positiveNumber?: boolean;
  
  /** Field should be a non-negative number */
  nonNegativeNumber?: boolean;
  
  /** Field should be a valid interest rate */
  interestRate?: boolean;
  
  /** Field should be a valid loan term */
  loanTerm?: boolean;
  
  /** Custom validation function */
  custom?: (value: any) => boolean | string;
}

/**
 * Form values type
 */
export type FormValues = Record<string, any>;

/**
 * Form validation state type
 */
export type FormValidationState = Record<string, FieldValidation>;

/**
 * Form validation hook options
 */
export interface UseFormValidationOptions {
  /** Whether to validate on change */
  validateOnChange?: boolean;
  
  /** Whether to validate on blur */
  validateOnBlur?: boolean;
  
  /** Whether to validate all fields on submit */
  validateOnSubmit?: boolean;
  
  /** Initial form values */
  initialValues?: FormValues;
}

/**
 * Hook for form validation
 * @param validationRules Validation rules for form fields
 * @param options Form validation options
 * @returns Form validation state and helpers
 */
export function useFormValidation(
  validationRules: Record<string, ValidationRules>,
  options: UseFormValidationOptions = {}
) {
  const {
    validateOnChange = true,
    validateOnBlur = true,
    validateOnSubmit = true,
    initialValues = {},
  } = options;
  
  // Initialize form values
  const [values, setValues] = useState<FormValues>(initialValues);
  
  // Initialize validation state
  const [validationState, setValidationState] = useState<FormValidationState>(() => {
    const initialState: FormValidationState = {};
    
    // Initialize validation state for each field
    Object.keys(validationRules).forEach(fieldName => {
      initialState[fieldName] = {
        valid: true,
        touched: false,
        required: !!validationRules[fieldName].required,
      };
    });
    
    return initialState;
  });
  
  // Initialize touched state
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  
  /**
   * Validate a single field
   */
  const validateField = useCallback((fieldName: string, value: any): FieldValidation => {
    const rules = validationRules[fieldName];
    
    if (!rules) {
      return { valid: true, touched: !!touched[fieldName], required: false };
    }
    
    // Start with a valid state
    let isValid = true;
    let errorMessage = '';
    
    // Required field validation
    if (rules.required && (value === '' || value === null || value === undefined)) {
      isValid = false;
      errorMessage = 'This field is required';
    }
    
    // Only continue validation if the field is not empty
    if (isValid && value !== '' && value !== null && value !== undefined) {
      // Email validation
      if (rules.email && !validationUtils.isValidEmail(value)) {
        isValid = false;
        errorMessage = 'Please enter a valid email address';
      }
      
      // Phone validation
      if (rules.phone && !validationUtils.isValidPhone(value)) {
        isValid = false;
        errorMessage = 'Please enter a valid phone number';
      }
      
      // Minimum length validation
      if (rules.minLength !== undefined && typeof value === 'string' && value.length < rules.minLength) {
        isValid = false;
        errorMessage = `Must be at least ${rules.minLength} characters`;
      }
      
      // Maximum length validation
      if (rules.maxLength !== undefined && typeof value === 'string' && value.length > rules.maxLength) {
        isValid = false;
        errorMessage = `Must be no more than ${rules.maxLength} characters`;
      }
      
      // Pattern validation
      if (rules.pattern && typeof value === 'string' && !rules.pattern.test(value)) {
        isValid = false;
        errorMessage = 'Please enter a valid value';
      }
      
      // Minimum value validation
      if (rules.min !== undefined && typeof value === 'number' && value < rules.min) {
        isValid = false;
        errorMessage = `Must be at least ${rules.min}`;
      }
      
      // Maximum value validation
      if (rules.max !== undefined && typeof value === 'number' && value > rules.max) {
        isValid = false;
        errorMessage = `Must be no more than ${rules.max}`;
      }
      
      // Positive number validation
      if (rules.positiveNumber && !financialValidation.isPositiveNumber(value)) {
        isValid = false;
        errorMessage = 'Must be a positive number';
      }
      
      // Non-negative number validation
      if (rules.nonNegativeNumber && !financialValidation.isNonNegativeNumber(value)) {
        isValid = false;
        errorMessage = 'Must be a non-negative number';
      }
      
      // Interest rate validation
      if (rules.interestRate && !financialValidation.isValidInterestRate(value)) {
        isValid = false;
        errorMessage = 'Please enter a valid interest rate';
      }
      
      // Loan term validation
      if (rules.loanTerm && !financialValidation.isValidLoanTerm(value)) {
        isValid = false;
        errorMessage = 'Please enter a valid loan term';
      }
      
      // Custom validation
      if (rules.custom) {
        const customResult = rules.custom(value);
        if (customResult !== true) {
          isValid = false;
          errorMessage = typeof customResult === 'string' ? customResult : 'Invalid value';
        }
      }
    }
    
    return {
      valid: isValid,
      error: isValid ? undefined : errorMessage,
      touched: !!touched[fieldName],
      required: !!rules.required,
    };
  }, [validationRules, touched]);
  
  /**
   * Validate all form fields
   */
  const validateForm = useCallback((): boolean => {
    let isFormValid = true;
    const newValidationState: FormValidationState = {};
    
    // Validate each field
    Object.keys(validationRules).forEach(fieldName => {
      const fieldValidation = validateField(fieldName, values[fieldName]);
      newValidationState[fieldName] = fieldValidation;
      
      if (!fieldValidation.valid) {
        isFormValid = false;
      }
    });
    
    // Update validation state
    setValidationState(newValidationState);
    
    return isFormValid;
  }, [validateField, validationRules, values]);
  
  /**
   * Handle field change
   */
  const handleChange = (fieldName: string, value: any) => {
    // Update values
    setValues(prevValues => ({
      ...prevValues,
      [fieldName]: value
    }));
    
    // Validate on change if enabled
    if (validateOnChange) {
      const fieldValidation = validateField(fieldName, value);
      setValidationState(prevState => ({
        ...prevState,
        [fieldName]: fieldValidation
      }));
    }
  };
  
  /**
   * Handle field blur
   */
  const handleBlur = (fieldName: string) => {
    // Mark field as touched
    setTouched(prevTouched => ({
      ...prevTouched,
      [fieldName]: true
    }));
    
    // Validate on blur if enabled
    if (validateOnBlur) {
      const fieldValidation = validateField(fieldName, values[fieldName]);
      fieldValidation.touched = true;
      
      setValidationState(prevState => ({
        ...prevState,
        [fieldName]: fieldValidation
      }));
    }
  };
  
  /**
   * Handle form submission
   */
  const handleSubmit = (callback: (values: FormValues) => void) => {
    return (e: React.FormEvent) => {
      e.preventDefault();
      
      // Mark all fields as touched
      const allTouched: Record<string, boolean> = {};
      Object.keys(validationRules).forEach(fieldName => {
        allTouched[fieldName] = true;
      });
      setTouched(allTouched);
      
      // Validate form on submit if enabled
      if (validateOnSubmit) {
        const isValid = validateForm();
        
        if (isValid) {
          callback(values);
        }
      } else {
        callback(values);
      }
    };
  };
  
  /**
   * Reset the form
   */
  const resetForm = (newValues = {}) => {
    setValues(newValues);
    setTouched({});
    
    const newValidationState: FormValidationState = {};
    Object.keys(validationRules).forEach(fieldName => {
      newValidationState[fieldName] = {
        valid: true,
        touched: false,
        required: !!validationRules[fieldName].required,
      };
    });
    
    setValidationState(newValidationState);
  };
  
  /**
   * Check if the form is valid
   */
  const isFormValid = useCallback(() => {
    return Object.values(validationState).every(field => field.valid);
  }, [validationState]);
  
  return {
    values,
    validationState,
    handleChange,
    handleBlur,
    handleSubmit,
    resetForm,
    validateForm,
    isFormValid: isFormValid(),
    setValues,
  };
}