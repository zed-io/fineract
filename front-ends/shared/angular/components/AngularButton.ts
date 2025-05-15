import { Component, Input, Output, EventEmitter, OnInit, ViewEncapsulation } from '@angular/core';
import { ButtonProps, ButtonVariant, ButtonSize, defaultButtonProps, buttonStyleGuidelines } from '../../core/components/Button';

/**
 * Angular implementation of the Button component
 * 
 * This component uses the core Button interface and implements it for Angular.
 */
@Component({
  selector: 'app-button',
  template: `
    <button
      [type]="type"
      [disabled]="disabled || loading"
      [ngClass]="getButtonClass()"
      [ngStyle]="getButtonStyle()"
      (click)="handleClick($event)"
    >
      <ng-container *ngIf="loading">
        <span class="loading-spinner" [ngStyle]="{ marginRight: (label || hasContent()) ? '0.5rem' : '0' }">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <circle
              cx="12"
              cy="12"
              r="10"
              fill="none"
              stroke="currentColor"
              stroke-width="3"
              stroke-dasharray="40"
              stroke-dashoffset="15"
            />
          </svg>
        </span>
      </ng-container>

      <ng-container *ngIf="iconPosition === 'left' && (icon || customIcon)">
        <span class="button-icon left" [ngStyle]="{ marginRight: (label || hasContent()) ? '0.5rem' : '0' }">
          <ng-container *ngIf="icon && !customIcon">
            <i class="icon icon-{{ icon }}"></i>
          </ng-container>
          <ng-container *ngIf="customIcon">
            <ng-content select="[slot=icon]"></ng-content>
          </ng-container>
        </span>
      </ng-container>

      <ng-container *ngIf="label">{{ label }}</ng-container>
      <ng-content *ngIf="!label"></ng-content>

      <ng-container *ngIf="iconPosition === 'right' && (icon || customIcon)">
        <span class="button-icon right" [ngStyle]="{ marginLeft: (label || hasContent()) ? '0.5rem' : '0' }">
          <ng-container *ngIf="icon && !customIcon">
            <i class="icon icon-{{ icon }}"></i>
          </ng-container>
          <ng-container *ngIf="customIcon">
            <ng-content select="[slot=icon]"></ng-content>
          </ng-container>
        </span>
      </ng-container>
    </button>
  `,
  styles: [`
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    
    .loading-spinner svg {
      animation: spin 1s linear infinite;
    }
  `],
  encapsulation: ViewEncapsulation.None
})
export class AngularButton implements OnInit, ButtonProps {
  @Input() label: string = '';
  @Input() icon?: string;
  @Input() iconPosition: 'left' | 'right' = defaultButtonProps.iconPosition as 'left' | 'right';
  @Input() variant: ButtonVariant = defaultButtonProps.variant as ButtonVariant;
  @Input() size: ButtonSize = defaultButtonProps.size as ButtonSize;
  @Input() disabled: boolean = defaultButtonProps.disabled as boolean;
  @Input() loading: boolean = defaultButtonProps.loading as boolean;
  @Input() fullWidth: boolean = defaultButtonProps.fullWidth as boolean;
  @Input() type: 'submit' | 'button' | 'reset' = defaultButtonProps.type as 'submit' | 'button' | 'reset';
  @Input() className: string = '';
  @Input() style: Record<string, any> = {};
  @Input() customIcon: boolean = false;

  @Output() onClick = new EventEmitter<Event>();

  private hasContentValue: boolean = false;

  ngOnInit() {
    // Set default values
    this.iconPosition = this.iconPosition || defaultButtonProps.iconPosition as 'left' | 'right';
    this.variant = this.variant || defaultButtonProps.variant as ButtonVariant;
    this.size = this.size || defaultButtonProps.size as ButtonSize;
    this.disabled = this.disabled !== undefined ? this.disabled : defaultButtonProps.disabled as boolean;
    this.loading = this.loading !== undefined ? this.loading : defaultButtonProps.loading as boolean;
    this.fullWidth = this.fullWidth !== undefined ? this.fullWidth : defaultButtonProps.fullWidth as boolean;
    this.type = this.type || defaultButtonProps.type as 'submit' | 'button' | 'reset';
  }

  hasContent(): boolean {
    return this.hasContentValue;
  }

  getButtonClass(): string {
    const classes = ['btn'];
    
    // Add variant class
    classes.push(`btn-${this.variant}`);
    
    // Add size class
    classes.push(`btn-${this.size}`);
    
    // Add conditional classes
    if (this.fullWidth) {
      classes.push('btn-full-width');
    }
    
    if (this.loading) {
      classes.push('btn-loading');
    }
    
    if (this.disabled) {
      classes.push('btn-disabled');
    }
    
    // Add any custom classes
    if (this.className) {
      classes.push(this.className);
    }
    
    return classes.join(' ');
  }

  getButtonStyle(): Record<string, string> {
    const baseStyles = buttonStyleGuidelines.base;
    const sizeStyles = buttonStyleGuidelines.sizes[this.size] || {};
    const variantStyles = buttonStyleGuidelines.variants[this.variant] || {};
    
    const styles: Record<string, string> = {
      fontWeight: baseStyles.fontWeight,
      borderRadius: baseStyles.borderRadius,
      transition: baseStyles.transition,
      cursor: this.disabled ? 'not-allowed' : this.loading ? 'wait' : 'pointer',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      lineHeight: baseStyles.lineHeight,
      padding: sizeStyles.padding as string,
      fontSize: sizeStyles.fontSize as string,
      height: sizeStyles.height as string,
      backgroundColor: variantStyles.backgroundColor as string,
      color: variantStyles.color as string,
      border: variantStyles.border as string,
      opacity: this.disabled ? '0.5' : '1',
      width: this.fullWidth ? '100%' : 'auto',
    };
    
    // Add any custom styles
    for (const key in this.style) {
      if (this.style.hasOwnProperty(key)) {
        styles[key] = this.style[key];
      }
    }
    
    return styles;
  }

  handleClick(event: Event): void {
    if (this.disabled || this.loading) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    
    this.onClick.emit(event);
  }
}