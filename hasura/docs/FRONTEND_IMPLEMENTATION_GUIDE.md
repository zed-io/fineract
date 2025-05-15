# Frontend Implementation Guide for Trinidad & Tobago Credit Unions

## Overview

This technical document outlines the frontend implementation required for the Trinidad and Tobago Credit Union modernization initiative. It provides detailed specifications for building both the staff portal and member-facing applications, focusing on creating intuitive, responsive, and efficient user interfaces that address the pain points identified in the user research.

## Design Philosophy

The frontend implementation follows these core principles:

1. **User-Centered Design** - Address the excessive clicks and navigation issues identified in the current systems
2. **Responsive and Adaptive** - Function seamlessly across desktop, tablet, and mobile devices
3. **Progressive Enhancement** - Core functionality works on basic devices, enhanced on modern platforms
4. **Accessibility First** - WCAG 2.1 AA compliance to serve all credit union members
5. **Performance Optimized** - Fast load times and responsive interactions even on slower networks

## Core Components & Implementation Priority

### 1. Staff Portal (Web Application)

The staff portal serves credit union employees and requires comprehensive functionality for member management, account operations, loan handling, and administrative tasks.

#### Technology Stack

- **Framework**: React with TypeScript
- **State Management**: React Query for server state, Context API for application state
- **UI Component Library**: Based on Material-UI with custom theming
- **Form Handling**: React Hook Form with Yup validation
- **Data Visualization**: Recharts for analytics dashboards
- **API Communication**: Apollo Client for GraphQL
- **Authentication**: JWT with refresh token mechanism
- **Routing**: React Router with route-based code splitting

#### Component Architecture

The staff portal follows a domain-driven component architecture:

```
/src
├── assets/              # Static assets and images
├── components/          # Shared components
│   ├── common/          # Basic UI components
│   ├── forms/           # Form components and helpers
│   ├── layout/          # Layout components
│   └── tables/          # Table and data display components
├── config/              # Application configuration
├── contexts/            # React context providers
├── features/            # Feature-specific components
│   ├── auth/            # Authentication & authorization
│   ├── clients/         # Client/member management
│   ├── loans/           # Loan management
│   ├── accounts/        # Account management
│   ├── transactions/    # Transaction processing
│   ├── reports/         # Reporting & analytics
│   ├── settings/        # System settings
│   └── dashboard/       # Dashboard & home screens
├── hooks/               # Custom React hooks
├── pages/               # Page components
├── services/            # API service clients
├── theme/               # Theming and styling
├── types/               # TypeScript type definitions
└── utils/               # Utility functions
```

#### Core Screens to Implement

1. **Dashboard & Navigation**
   - Main dashboard with key performance indicators
   - Activity feed showing recent actions
   - Global search functionality
   - Navigation menu with role-based access control

2. **Member Management**
   - Member search and listing with filtering
   - Member profile viewing and editing
   - Member onboarding workflow
   - Document management and verification
   - KYC/AML check integration

3. **Loan Origination & Management**
   - Loan application creation and editing
   - Document upload and verification
   - Loan approval workflow with decision support
   - Loan details and repayment schedule
   - Loan transaction history
   - Delinquency management

4. **Account Management**
   - Account creation and maintenance
   - Transaction history with advanced filtering
   - Statement generation
   - Account settings and preferences

5. **Transaction Processing**
   - Deposit and withdrawal processing
   - Transfer management
   - Batch transaction processing
   - Transaction verification and approval
   - Receipt generation

6. **Reporting & Analytics**
   - Report generation and customization
   - Data visualization dashboards
   - Export functionality (PDF, Excel, CSV)
   - Scheduled report management

### 2. Member-Facing Application (Mobile/Web)

The member-facing application provides credit union members with self-service capabilities through both web and mobile platforms.

#### Technology Stack

- **Framework**: React Native for mobile, React for web with shared code
- **State Management**: Redux Toolkit for complex state, React Query for server data
- **UI Component Library**: Custom component library for consistent experience
- **Form Handling**: Formik with Yup validation
- **API Communication**: Apollo Client for GraphQL with offline support
- **Authentication**: JWT with biometric integration
- **Navigation**: React Navigation for mobile, React Router for web

#### Component Architecture

The member application follows a feature-based component architecture:

```
/src
├── assets/              # Static assets and images
├── components/          # Shared components
│   ├── common/          # Basic UI components
│   ├── forms/           # Form components
│   └── layout/          # Layout components
├── config/              # Application configuration
├── features/            # Feature-specific components
│   ├── auth/            # Authentication screens
│   ├── accounts/        # Account management
│   ├── payments/        # Payment and transfer functions
│   ├── loans/           # Loan application and management
│   ├── profile/         # User profile and settings
│   └── notifications/   # Notification management
├── hooks/               # Custom React hooks
├── navigation/          # Navigation configuration
├── screens/             # Screen components
├── services/            # API clients
├── store/               # Redux store configuration
├── theme/               # Theming and styling
├── types/               # TypeScript type definitions
└── utils/               # Utility functions
```

#### Core Screens to Implement

1. **Authentication & Profile**
   - Login with biometric options
   - Registration and onboarding
   - Profile management
   - Security settings
   - Notification preferences

2. **Account Dashboard**
   - Account balance overview
   - Recent transaction summary
   - Quick action shortcuts
   - Upcoming payments reminder
   - Personalized financial insights

3. **Account Management**
   - Account details view
   - Transaction history with search
   - Statement download
   - Account settings
   - Card management

4. **Payments & Transfers**
   - Fund transfers between accounts
   - Bill payments
   - Mobile wallet integration
   - Payment scheduling
   - Recurring payment setup
   - QR code payment

5. **Loan Functions**
   - Loan application with step-by-step wizard
   - Document upload and verification
   - Loan status tracking
   - Repayment schedule view
   - Loan repayment processing
   - Early repayment calculator

6. **Notifications & Communications**
   - Push notification center
   - Secure messaging with credit union
   - Important alerts and reminders
   - Document inbox

## Implementation Details

### User Interface Design System

Create a comprehensive design system that includes:

#### Core Elements

```typescript
// Button component example
import React from 'react';
import { 
  TouchableOpacity, 
  Text, 
  ActivityIndicator, 
  StyleSheet, 
  ViewStyle, 
  TextStyle 
} from 'react-native';
import { colors, spacing, typography } from '../../theme';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'text';
  size?: 'small' | 'medium' | 'large';
  isLoading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  isLoading = false,
  disabled = false,
  style,
  textStyle,
  leftIcon,
  rightIcon,
}) => {
  const buttonStyles = [
    styles.base,
    styles[variant],
    styles[`${size}Size`],
    disabled && styles.disabled,
    style,
  ];

  const textStyles = [
    styles.text,
    styles[`${variant}Text`],
    styles[`${size}Text`],
    disabled && styles.disabledText,
    textStyle,
  ];

  return (
    <TouchableOpacity
      style={buttonStyles}
      onPress={onPress}
      disabled={disabled || isLoading}
      activeOpacity={0.8}
    >
      {isLoading ? (
        <ActivityIndicator
          color={variant === 'primary' ? colors.white : colors.primary}
          size="small"
        />
      ) : (
        <>
          {leftIcon && <View style={styles.iconLeft}>{leftIcon}</View>}
          <Text style={textStyles}>{title}</Text>
          {rightIcon && <View style={styles.iconRight}>{rightIcon}</View>}
        </>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  primary: {
    backgroundColor: colors.primary,
  },
  secondary: {
    backgroundColor: colors.secondary,
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.primary,
  },
  text: {
    backgroundColor: 'transparent',
  },
  smallSize: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.s,
  },
  mediumSize: {
    paddingVertical: spacing.s,
    paddingHorizontal: spacing.m,
  },
  largeSize: {
    paddingVertical: spacing.m,
    paddingHorizontal: spacing.l,
  },
  disabled: {
    backgroundColor: colors.gray,
    borderColor: colors.gray,
  },
  text: {
    fontFamily: typography.primary,
    fontWeight: 'bold',
  },
  primaryText: {
    color: colors.white,
  },
  secondaryText: {
    color: colors.white,
  },
  outlineText: {
    color: colors.primary,
  },
  textText: {
    color: colors.primary,
  },
  smallText: {
    fontSize: typography.sizes.s,
  },
  mediumText: {
    fontSize: typography.sizes.m,
  },
  largeText: {
    fontSize: typography.sizes.l,
  },
  disabledText: {
    color: colors.lightGray,
  },
  iconLeft: {
    marginRight: spacing.xs,
  },
  iconRight: {
    marginLeft: spacing.xs,
  },
});
```

#### Theme Configuration

```typescript
// theme/colors.ts
export const colors = {
  // Primary brand colors
  primary: '#0052CC',
  primaryLight: '#4C9AFF',
  primaryDark: '#0747A6',
  
  // Secondary brand colors
  secondary: '#00875A',
  secondaryLight: '#36B37E',
  secondaryDark: '#006644',
  
  // Accent colors
  accent: '#6554C0',
  accentLight: '#8777D9',
  accentDark: '#403294',
  
  // Semantic colors
  success: '#36B37E',
  warning: '#FFAB00',
  error: '#FF5630',
  info: '#4C9AFF',
  
  // Neutrals
  black: '#172B4D',
  darkGray: '#505F79',
  gray: '#7A869A',
  lightGray: '#DFE1E6',
  lighterGray: '#F4F5F7',
  white: '#FFFFFF',
  
  // Background colors
  background: '#F4F5F7',
  cardBackground: '#FFFFFF',
  
  // Text colors
  textPrimary: '#172B4D',
  textSecondary: '#505F79',
  textDisabled: '#7A869A',
  textInverse: '#FFFFFF',
  
  // Border colors
  border: '#DFE1E6',
  borderFocus: '#4C9AFF',
};

// theme/typography.ts
export const typography = {
  primary: 'Roboto, system-ui, sans-serif',
  secondary: 'Roboto Slab, serif',
  
  sizes: {
    xs: 12,
    s: 14,
    m: 16,
    l: 18,
    xl: 20,
    xxl: 24,
    xxxl: 30,
    display: 36,
  },
  
  weights: {
    light: '300',
    regular: '400',
    medium: '500',
    bold: '700',
  },
  
  lineHeights: {
    tight: 1.2,
    normal: 1.5,
    loose: 1.8,
  },
};

// theme/spacing.ts
export const spacing = {
  xs: 4,
  s: 8,
  m: 16,
  l: 24,
  xl: 32,
  xxl: 48,
  xxxl: 64,
};
```

### Form Implementation

Create reusable form components for consistent validation and data entry:

```typescript
// components/forms/FormField.tsx
import React from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { useField } from 'formik';
import { colors, spacing, typography } from '../../theme';

interface FormFieldProps {
  name: string;
  label: string;
  placeholder?: string;
  secureTextEntry?: boolean;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  keyboardType?: 'default' | 'email-address' | 'numeric' | 'phone-pad';
  multiline?: boolean;
  numberOfLines?: number;
  helperText?: string;
  disabled?: boolean;
}

export const FormField: React.FC<FormFieldProps> = ({
  name,
  label,
  placeholder,
  secureTextEntry = false,
  autoCapitalize = 'none',
  keyboardType = 'default',
  multiline = false,
  numberOfLines = 1,
  helperText,
  disabled = false,
}) => {
  const [field, meta, helpers] = useField(name);
  const hasError = meta.touched && meta.error;
  
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[
          styles.input,
          multiline && styles.multilineInput,
          hasError && styles.errorInput,
          disabled && styles.disabledInput,
        ]}
        value={field.value}
        onChangeText={field.onChange(name)}
        onBlur={field.onBlur(name)}
        placeholder={placeholder}
        placeholderTextColor={colors.gray}
        secureTextEntry={secureTextEntry}
        autoCapitalize={autoCapitalize}
        keyboardType={keyboardType}
        multiline={multiline}
        numberOfLines={multiline ? numberOfLines : undefined}
        editable={!disabled}
      />
      {helperText && !hasError && (
        <Text style={styles.helperText}>{helperText}</Text>
      )}
      {hasError && (
        <Text style={styles.errorText}>{meta.error}</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.m,
  },
  label: {
    fontFamily: typography.primary,
    fontSize: typography.sizes.s,
    fontWeight: typography.weights.medium,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: spacing.m,
    fontFamily: typography.primary,
    fontSize: typography.sizes.m,
    color: colors.textPrimary,
    backgroundColor: colors.white,
  },
  multilineInput: {
    height: undefined,
    paddingTop: spacing.s,
    paddingBottom: spacing.s,
    textAlignVertical: 'top',
  },
  errorInput: {
    borderColor: colors.error,
  },
  disabledInput: {
    backgroundColor: colors.lighterGray,
    color: colors.textDisabled,
  },
  helperText: {
    fontFamily: typography.primary,
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  errorText: {
    fontFamily: typography.primary,
    fontSize: typography.sizes.xs,
    color: colors.error,
    marginTop: spacing.xs,
  },
});
```

### Authentication Flow

Implement secure authentication with support for multiple factors:

```typescript
// features/auth/LoginScreen.tsx
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Formik } from 'formik';
import * as Yup from 'yup';
import { useMutation } from '@apollo/client';
import { useNavigation } from '@react-navigation/native';

import { FormField, Button, SafeAreaView } from '../../components';
import { LOGIN_MUTATION } from '../../graphql/mutations';
import { useAuth } from '../../contexts/AuthContext';
import { colors, spacing, typography } from '../../theme';
import { useBiometrics } from '../../hooks/useBiometrics';

const loginValidationSchema = Yup.object().shape({
  username: Yup.string().required('Username is required'),
  password: Yup.string().required('Password is required'),
});

export const LoginScreen: React.FC = () => {
  const navigation = useNavigation();
  const { login } = useAuth();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { isBiometricsAvailable, authenticateWithBiometrics } = useBiometrics();
  
  const [loginMutation, { loading }] = useMutation(LOGIN_MUTATION, {
    onCompleted: (data) => {
      login(data.login.token, data.login.refreshToken, data.login.user);
    },
    onError: (error) => {
      setErrorMessage(error.message);
    },
  });
  
  const handleLogin = async (values: { username: string; password: string }) => {
    setErrorMessage(null);
    await loginMutation({
      variables: {
        username: values.username,
        password: values.password,
      },
    });
  };
  
  const handleBiometricLogin = async () => {
    try {
      const result = await authenticateWithBiometrics();
      if (result.success) {
        // Implement your biometric authentication logic here
        // This might involve retrieving stored credentials and calling loginMutation
      } else {
        setErrorMessage(result.error || 'Biometric authentication failed');
      }
    } catch (error) {
      setErrorMessage('Biometric authentication failed');
    }
  };
  
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.logoContainer}>
        <Image
          source={require('../../assets/images/logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />
      </View>
      
      <View style={styles.formContainer}>
        <Text style={styles.title}>Log In to Your Account</Text>
        
        {errorMessage && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        )}
        
        <Formik
          initialValues={{ username: '', password: '' }}
          validationSchema={loginValidationSchema}
          onSubmit={handleLogin}
        >
          {({ handleSubmit }) => (
            <View>
              <FormField
                name="username"
                label="Username"
                placeholder="Enter your username"
                autoCapitalize="none"
                keyboardType="email-address"
              />
              
              <FormField
                name="password"
                label="Password"
                placeholder="Enter your password"
                secureTextEntry
              />
              
              <TouchableOpacity
                onPress={() => navigation.navigate('ForgotPassword')}
                style={styles.forgotPasswordLink}
              >
                <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
              </TouchableOpacity>
              
              <Button
                title="Log In"
                onPress={handleSubmit}
                isLoading={loading}
                style={styles.loginButton}
              />
              
              {isBiometricsAvailable && (
                <Button
                  title="Login with Biometrics"
                  variant="outline"
                  onPress={handleBiometricLogin}
                  style={styles.biometricButton}
                />
              )}
            </View>
          )}
        </Formik>
        
        <View style={styles.registerContainer}>
          <Text style={styles.registerText}>Don't have an account?</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Register')}>
            <Text style={styles.registerLink}>Sign Up</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  logoContainer: {
    alignItems: 'center',
    marginTop: spacing.xxl,
    marginBottom: spacing.xl,
  },
  logo: {
    width: 200,
    height: 80,
  },
  formContainer: {
    flex: 1,
    paddingHorizontal: spacing.l,
  },
  title: {
    fontFamily: typography.primary,
    fontSize: typography.sizes.xxl,
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
    marginBottom: spacing.l,
    textAlign: 'center',
  },
  errorContainer: {
    backgroundColor: colors.error + '20', // 20% opacity
    padding: spacing.m,
    borderRadius: 8,
    marginBottom: spacing.m,
  },
  errorText: {
    fontFamily: typography.primary,
    fontSize: typography.sizes.s,
    color: colors.error,
    textAlign: 'center',
  },
  forgotPasswordLink: {
    alignSelf: 'flex-end',
    marginBottom: spacing.m,
  },
  forgotPasswordText: {
    fontFamily: typography.primary,
    fontSize: typography.sizes.s,
    color: colors.primary,
  },
  loginButton: {
    marginTop: spacing.m,
  },
  biometricButton: {
    marginTop: spacing.m,
  },
  registerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: spacing.xxl,
  },
  registerText: {
    fontFamily: typography.primary,
    fontSize: typography.sizes.s,
    color: colors.textSecondary,
  },
  registerLink: {
    fontFamily: typography.primary,
    fontSize: typography.sizes.s,
    color: colors.primary,
    fontWeight: typography.weights.medium,
    marginLeft: spacing.xs,
  },
});
```

### Loan Application Workflow

Create an intuitive multi-step loan application process:

```typescript
// features/loans/LoanApplicationScreen.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useMutation, useQuery } from '@apollo/client';
import { useNavigation, useRoute } from '@react-navigation/native';

import {
  SafeAreaView,
  Button,
  ProgressSteps,
  ScreenHeader,
  LoadingOverlay,
  ErrorMessage,
} from '../../components';
import { 
  PersonalInformationStep,
  LoanDetailsStep,
  EmploymentInformationStep,
  DocumentUploadStep,
  ReviewStep,
} from './steps';
import { 
  FETCH_LOAN_PRODUCTS,
  CREATE_LOAN_APPLICATION, 
  UPDATE_LOAN_APPLICATION,
  SUBMIT_LOAN_APPLICATION 
} from '../../graphql/mutations';
import { useAuth } from '../../contexts/AuthContext';
import { colors, spacing } from '../../theme';

type LoanApplicationStep = {
  id: string;
  title: string;
  component: React.ReactNode;
  isValid: boolean;
};

export const LoanApplicationScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { user } = useAuth();
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [loanApplicationId, setLoanApplicationId] = useState<string | null>(null);
  const [applicationData, setApplicationData] = useState({
    personalInfo: {},
    loanDetails: {},
    employmentInfo: {},
    documents: [],
  });
  const [stepValidation, setStepValidation] = useState({
    personalInfo: false,
    loanDetails: false,
    employmentInfo: false,
    documents: false,
    review: false,
  });
  
  // Fetch loan products
  const { loading: productsLoading, error: productsError, data: productsData } = useQuery(FETCH_LOAN_PRODUCTS);
  
  // Create loan application mutation
  const [createLoanApplication, { loading: createLoading }] = useMutation(CREATE_LOAN_APPLICATION, {
    onCompleted: (data) => {
      setLoanApplicationId(data.createLoanApplication.id);
    },
    onError: (error) => {
      // Handle error
    },
  });
  
  // Update loan application mutation
  const [updateLoanApplication, { loading: updateLoading }] = useMutation(UPDATE_LOAN_APPLICATION);
  
  // Submit loan application mutation
  const [submitLoanApplication, { loading: submitLoading }] = useMutation(SUBMIT_LOAN_APPLICATION, {
    onCompleted: (data) => {
      navigation.navigate('LoanApplicationSuccess', {
        applicationId: loanApplicationId,
        referenceNumber: data.submitLoanApplication.referenceNumber,
      });
    },
    onError: (error) => {
      // Handle error
    },
  });
  
  // Initialize application or load existing one
  useEffect(() => {
    const initializeApplication = async () => {
      if (route.params?.applicationId) {
        // Load existing application
        setLoanApplicationId(route.params.applicationId);
        // Fetch application data and populate state
      } else {
        // Create new application
        await createLoanApplication({
          variables: {
            input: {
              clientId: user.id,
            },
          },
        });
      }
    };
    
    initializeApplication();
  }, []);
  
  // Define the steps
  const steps: LoanApplicationStep[] = [
    {
      id: 'personalInfo',
      title: 'Personal Information',
      component: (
        <PersonalInformationStep
          data={applicationData.personalInfo}
          onDataChange={(data) => handleStepDataChange('personalInfo', data)}
          onValidationChange={(isValid) => handleStepValidationChange('personalInfo', isValid)}
        />
      ),
      isValid: stepValidation.personalInfo,
    },
    {
      id: 'loanDetails',
      title: 'Loan Details',
      component: (
        <LoanDetailsStep
          data={applicationData.loanDetails}
          products={productsData?.loanProducts || []}
          onDataChange={(data) => handleStepDataChange('loanDetails', data)}
          onValidationChange={(isValid) => handleStepValidationChange('loanDetails', isValid)}
        />
      ),
      isValid: stepValidation.loanDetails,
    },
    {
      id: 'employmentInfo',
      title: 'Employment Information',
      component: (
        <EmploymentInformationStep
          data={applicationData.employmentInfo}
          onDataChange={(data) => handleStepDataChange('employmentInfo', data)}
          onValidationChange={(isValid) => handleStepValidationChange('employmentInfo', isValid)}
        />
      ),
      isValid: stepValidation.employmentInfo,
    },
    {
      id: 'documents',
      title: 'Document Upload',
      component: (
        <DocumentUploadStep
          data={applicationData.documents}
          requiredDocuments={applicationData.loanDetails.requiredDocuments || []}
          onDataChange={(data) => handleStepDataChange('documents', data)}
          onValidationChange={(isValid) => handleStepValidationChange('documents', isValid)}
        />
      ),
      isValid: stepValidation.documents,
    },
    {
      id: 'review',
      title: 'Review & Submit',
      component: (
        <ReviewStep
          applicationData={applicationData}
          onValidationChange={(isValid) => handleStepValidationChange('review', isValid)}
        />
      ),
      isValid: stepValidation.review,
    },
  ];
  
  const handleStepDataChange = (stepId: string, data: any) => {
    setApplicationData((prevData) => ({
      ...prevData,
      [stepId]: data,
    }));
    
    // Save changes to server
    if (loanApplicationId) {
      updateLoanApplication({
        variables: {
          input: {
            id: loanApplicationId,
            stepId,
            data,
          },
        },
      });
    }
  };
  
  const handleStepValidationChange = (stepId: string, isValid: boolean) => {
    setStepValidation((prevValidation) => ({
      ...prevValidation,
      [stepId]: isValid,
    }));
  };
  
  const handleNext = () => {
    if (currentStepIndex < steps.length - 1) {
      setCurrentStepIndex(currentStepIndex + 1);
    } else {
      // Submit application
      submitLoanApplication({
        variables: {
          input: {
            id: loanApplicationId,
          },
        },
      });
    }
  };
  
  const handlePrevious = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(currentStepIndex - 1);
    }
  };
  
  const handleCancel = () => {
    // Show confirmation dialog before canceling
    navigation.goBack();
  };
  
  if (productsLoading || !loanApplicationId) {
    return <LoadingOverlay message="Loading application..." />;
  }
  
  if (productsError) {
    return <ErrorMessage message="Failed to load loan products" onRetry={() => {}} />;
  }
  
  const currentStep = steps[currentStepIndex];
  const isLastStep = currentStepIndex === steps.length - 1;
  const isStepValid = currentStep.isValid;
  
  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader
        title="Loan Application"
        showBackButton
        onBackPress={handleCancel}
      />
      
      <ProgressSteps
        steps={steps.map(step => step.title)}
        currentStep={currentStepIndex}
        onStepPress={(index) => {
          if (index < currentStepIndex) {
            setCurrentStepIndex(index);
          }
        }}
      />
      
      <ScrollView style={styles.contentContainer}>
        {currentStep.component}
      </ScrollView>
      
      <View style={styles.footer}>
        <Button
          title="Previous"
          variant="outline"
          onPress={handlePrevious}
          disabled={currentStepIndex === 0}
          style={styles.footerButton}
        />
        
        <Button
          title={isLastStep ? 'Submit Application' : 'Next'}
          onPress={handleNext}
          disabled={!isStepValid}
          isLoading={updateLoading || submitLoading}
          style={[styles.footerButton, styles.primaryButton]}
        />
      </View>
      
      {(createLoading || updateLoading || submitLoading) && (
        <LoadingOverlay message="Saving changes..." />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  contentContainer: {
    flex: 1,
    padding: spacing.l,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: spacing.m,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.white,
  },
  footerButton: {
    flex: 1,
    marginHorizontal: spacing.xs,
  },
  primaryButton: {
    backgroundColor: colors.primary,
  },
});
```

### Responsive Design Implementation

Create a responsive layout system:

```typescript
// components/layout/ResponsiveContainer.tsx
import React from 'react';
import { View, StyleSheet, useWindowDimensions, ViewStyle } from 'react-native';

interface ResponsiveContainerProps {
  children: React.ReactNode;
  maxWidth?: number;
  horizontalPadding?: number;
  style?: ViewStyle;
}

export const ResponsiveContainer: React.FC<ResponsiveContainerProps> = ({
  children,
  maxWidth = 1200,
  horizontalPadding = 16,
  style,
}) => {
  const { width } = useWindowDimensions();
  
  return (
    <View style={[styles.container, { paddingHorizontal: horizontalPadding }, style]}>
      <View style={[styles.content, { maxWidth }]}>
        {children}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    alignItems: 'center',
  },
  content: {
    width: '100%',
  },
});
```

### State Management

Implement application state management:

```typescript
// store/slices/loanApplicationSlice.ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface LoanApplicationState {
  applicationId: string | null;
  currentStep: number;
  steps: {
    personalInfo: {
      isComplete: boolean;
      data: any;
    };
    loanDetails: {
      isComplete: boolean;
      data: any;
    };
    employmentInfo: {
      isComplete: boolean;
      data: any;
    };
    documents: {
      isComplete: boolean;
      data: any;
    };
    review: {
      isComplete: boolean;
    };
  };
  isSubmitting: boolean;
  error: string | null;
}

const initialState: LoanApplicationState = {
  applicationId: null,
  currentStep: 0,
  steps: {
    personalInfo: {
      isComplete: false,
      data: {},
    },
    loanDetails: {
      isComplete: false,
      data: {},
    },
    employmentInfo: {
      isComplete: false,
      data: {},
    },
    documents: {
      isComplete: false,
      data: [],
    },
    review: {
      isComplete: false,
    },
  },
  isSubmitting: false,
  error: null,
};

export const loanApplicationSlice = createSlice({
  name: 'loanApplication',
  initialState,
  reducers: {
    setApplicationId: (state, action: PayloadAction<string>) => {
      state.applicationId = action.payload;
    },
    setCurrentStep: (state, action: PayloadAction<number>) => {
      state.currentStep = action.payload;
    },
    updateStepData: (state, action: PayloadAction<{ step: keyof typeof state.steps; data: any }>) => {
      const { step, data } = action.payload;
      state.steps[step].data = data;
    },
    completeStep: (state, action: PayloadAction<keyof typeof state.steps>) => {
      state.steps[action.payload].isComplete = true;
    },
    setSubmitting: (state, action: PayloadAction<boolean>) => {
      state.isSubmitting = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    resetApplication: (state) => {
      return initialState;
    },
  },
});

export const {
  setApplicationId,
  setCurrentStep,
  updateStepData,
  completeStep,
  setSubmitting,
  setError,
  resetApplication,
} = loanApplicationSlice.actions;

export default loanApplicationSlice.reducer;
```

### API Communication

Configure Apollo Client for GraphQL communication:

```typescript
// services/apolloClient.ts
import { ApolloClient, InMemoryCache, HttpLink, from } from '@apollo/client';
import { onError } from '@apollo/client/link/error';
import { RetryLink } from '@apollo/client/link/retry';
import { setContext } from '@apollo/client/link/context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AUTH_TOKEN_KEY } from '../constants';

// Error handling link
const errorLink = onError(({ graphQLErrors, networkError }) => {
  if (graphQLErrors)
    graphQLErrors.forEach(({ message, locations, path }) => {
      console.log(
        `[GraphQL error]: Message: ${message}, Location: ${locations}, Path: ${path}`
      );
    });
  if (networkError) console.log(`[Network error]: ${networkError}`);
});

// Retry link for intermittent network issues
const retryLink = new RetryLink({
  delay: {
    initial: 300,
    max: 3000,
    jitter: true,
  },
  attempts: {
    max: 5,
    retryIf: (error, _operation) => !!error && error.message !== 'Unauthorized',
  },
});

// Auth link to add token to requests
const authLink = setContext(async (_, { headers }) => {
  // Get the token from storage
  const token = await AsyncStorage.getItem(AUTH_TOKEN_KEY);
  
  // Return the headers to the context
  return {
    headers: {
      ...headers,
      authorization: token ? `Bearer ${token}` : '',
    },
  };
});

// HTTP link to the GraphQL API
const httpLink = new HttpLink({
  uri: 'https://api.creditunion.com/graphql',
});

// Combine the links
const link = from([
  errorLink,
  retryLink,
  authLink,
  httpLink,
]);

// Create the Apollo Client
const apolloClient = new ApolloClient({
  link,
  cache: new InMemoryCache(),
  defaultOptions: {
    watchQuery: {
      fetchPolicy: 'cache-and-network',
      errorPolicy: 'all',
    },
    query: {
      fetchPolicy: 'network-only',
      errorPolicy: 'all',
    },
    mutate: {
      errorPolicy: 'all',
    },
  },
});

export default apolloClient;
```

## Implementation Workflow

### Phase 1: Foundation (1-3 months)

1. **Setup Project Infrastructure**
   - Initialize project repositories
   - Configure CI/CD pipelines
   - Set up development environments

2. **Design System Implementation**
   - Create core UI components
   - Implement theming system
   - Build responsive layouts

3. **Core Authentication & Navigation**
   - Implement login and registration flows
   - Create navigation structure
   - Set up role-based access control

### Phase 2: Core Features (4-6 months)

1. **Member Management**
   - Build client profile screens
   - Implement member onboarding flow
   - Create document management features

2. **Account Management**
   - Develop account creation and management screens
   - Build transaction history and filtering
   - Implement statement generation

3. **Staff Dashboard**
   - Create administrative dashboard
   - Implement key performance indicators
   - Build activity tracking and management tools

### Phase 3: Loan Features (7-9 months)

1. **Loan Application**
   - Develop step-by-step application wizard
   - Implement document upload and verification
   - Create application review and submission

2. **Loan Management**
   - Build loan status tracking
   - Implement repayment schedule views
   - Create loan transaction processing

3. **Loan Approval Workflow**
   - Develop staff approval interfaces
   - Implement decision support tools
   - Create notification and alert system

### Phase 4: Advanced Features (10-12 months)

1. **Reporting & Analytics**
   - Build customizable reporting tools
   - Implement data visualization dashboards
   - Create export functionality

2. **Integration Features**
   - Develop payment processing interfaces
   - Implement external system connectors
   - Build notification system

3. **Performance Optimization**
   - Optimize application performance
   - Implement caching strategies
   - Enhance offline capabilities

## Additional Considerations

### Accessibility

Ensure compliance with WCAG 2.1 AA standards:

- Proper semantic HTML
- Sufficient color contrast
- Screen reader compatibility
- Keyboard navigation support
- Focus indicators
- Alternative text for images

### Internationalization

Prepare for multi-language support:

- Extract all text to resource files
- Use React-Intl for formatting and translations
- Support right-to-left languages
- Format dates, numbers, and currencies according to locale

### Performance Optimization

Implement performance best practices:

- Code splitting and lazy loading
- Asset optimization
- Memoization of expensive calculations
- Virtualized lists for large data sets
- Efficient network requests with caching
- Progressive image loading

### Testing Strategy

Implement comprehensive testing:

1. **Unit Tests**
   - Component testing with React Testing Library
   - State management tests with Redux Test Utils
   - Form validation tests

2. **Integration Tests**
   - Screen workflow tests
   - Navigation flow tests
   - API integration tests

3. **End-to-End Tests**
   - Critical user journeys with Detox
   - Performance tests

4. **Accessibility Tests**
   - Automated accessibility checks
   - Manual screen reader testing

## Next Steps

1. Develop the design system and component library
2. Implement authentication and core navigation
3. Create member dashboard and account management screens
4. Build the loan application workflow
5. Develop reporting and analytics dashboards