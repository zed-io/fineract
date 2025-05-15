import React from 'react';
import { ButtonProps, ButtonVariant, ButtonSize, defaultButtonProps, buttonStyleGuidelines } from '../../core/components/Button';

/**
 * React implementation of the Button component
 * 
 * This component uses the core Button interface and implements it for React.
 */
export interface ReactButtonProps extends ButtonProps {
  /** Additional React-specific props */
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  
  /** React children nodes */
  children?: React.ReactNode;
  
  /** React ref */
  ref?: React.Ref<HTMLButtonElement>;
}

/**
 * React Button component
 * This can be used in the Next.js application
 */
export const ReactButton: React.FC<ReactButtonProps> = React.forwardRef<HTMLButtonElement, ReactButtonProps>(
  (
    {
      label,
      children,
      icon,
      iconPosition = defaultButtonProps.iconPosition,
      variant = defaultButtonProps.variant,
      size = defaultButtonProps.size,
      disabled = defaultButtonProps.disabled,
      loading = defaultButtonProps.loading,
      fullWidth = defaultButtonProps.fullWidth,
      type = defaultButtonProps.type,
      onClick,
      className = '',
      style,
      ...rest
    },
    ref
  ) => {
    // Combine styles based on the variant and size
    const buttonStyles = {
      ...buttonStyleGuidelines.base,
      ...(size && buttonStyleGuidelines.sizes[size]),
      ...(variant && buttonStyleGuidelines.variants[variant]),
      ...(disabled && buttonStyleGuidelines.states.disabled),
      ...(loading && buttonStyleGuidelines.states.loading),
      ...(fullWidth && buttonStyleGuidelines.states.fullWidth),
      ...style,
    };

    // Convert style object to React inline style object
    const convertedStyle: React.CSSProperties = {
      fontWeight: buttonStyles.fontWeight as any,
      borderRadius: buttonStyles.borderRadius,
      transition: buttonStyles.transition,
      cursor: disabled ? 'not-allowed' : loading ? 'wait' : 'pointer',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      lineHeight: buttonStyles.lineHeight as any,
      padding: (size && buttonStyleGuidelines.sizes[size]?.padding) as string,
      fontSize: (size && buttonStyleGuidelines.sizes[size]?.fontSize) as string,
      height: (size && buttonStyleGuidelines.sizes[size]?.height) as string,
      backgroundColor: (variant && buttonStyleGuidelines.variants[variant]?.backgroundColor) as string,
      color: (variant && buttonStyleGuidelines.variants[variant]?.color) as string,
      border: (variant && buttonStyleGuidelines.variants[variant]?.border) as string,
      opacity: disabled ? 0.5 : 1,
      width: fullWidth ? '100%' : 'auto',
      ...style,
    };

    // Handle icon rendering
    const renderIcon = () => {
      if (!icon) return null;
      
      if (typeof icon === 'string') {
        // Render as icon name (assuming using an icon library or font icons)
        return <span className={`icon icon-${icon}`} />;
      }
      
      // Render as React component
      return icon;
    };

    const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
      if (disabled || loading) {
        event.preventDefault();
        return;
      }
      
      onClick?.(event);
    };

    return (
      <button
        ref={ref}
        type={type}
        className={className}
        style={convertedStyle}
        disabled={disabled || loading}
        onClick={handleClick}
        {...rest}
      >
        {loading && (
          <span style={{ marginRight: label || children ? '0.5rem' : 0 }}>
            {/* Simple loading spinner */}
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
              style={{
                animation: 'spin 1s linear infinite',
              }}
            >
              <style>
                {`
                  @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                  }
                `}
              </style>
              <circle
                cx="12"
                cy="12"
                r="10"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeDasharray="40"
                strokeDashoffset="15"
              />
            </svg>
          </span>
        )}
        
        {iconPosition === 'left' && renderIcon() && (
          <span style={{ marginRight: label || children ? '0.5rem' : 0 }}>
            {renderIcon()}
          </span>
        )}
        
        {label || children}
        
        {iconPosition === 'right' && renderIcon() && (
          <span style={{ marginLeft: label || children ? '0.5rem' : 0 }}>
            {renderIcon()}
          </span>
        )}
      </button>
    );
  }
);

ReactButton.displayName = 'ReactButton';

export default ReactButton;