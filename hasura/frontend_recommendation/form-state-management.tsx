import React from 'react';
import { useForm, FormProvider, useFormContext, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { TextField, FormControl, FormHelperText } from '@mui/material';

// Best Practices for Form State Management with GraphQL Types

// 1. Create reusable form field components
interface FormFieldProps {
  name: string;
  label: string;
  required?: boolean;
}

export const FormTextField: React.FC<FormFieldProps> = ({ name, label, required = false }) => {
  const { control, formState: { errors } } = useFormContext();
  const error = errors[name];
  
  return (
    <Controller
      name={name}
      control={control}
      render={({ field }) => (
        <TextField
          {...field}
          label={label}
          fullWidth
          error={!!error}
          helperText={error?.message as string}
          required={required}
        />
      )}
    />
  );
};

// 2. Create type-safe form containers that work with GraphQL types
interface FormContainerProps<T extends Record<string, any>> {
  defaultValues: Partial<T>;
  validationSchema: yup.ObjectSchema<any>;
  onSubmit: (data: T) => void;
  children: React.ReactNode;
}

export function FormContainer<T extends Record<string, any>>({
  defaultValues,
  validationSchema,
  onSubmit,
  children
}: FormContainerProps<T>) {
  const methods = useForm<T>({
    defaultValues,
    resolver: yupResolver(validationSchema)
  });

  return (
    <FormProvider {...methods}>
      <form onSubmit={methods.handleSubmit(onSubmit)}>
        {children}
      </form>
    </FormProvider>
  );
}

// 3. Create form state adapters for GraphQL mutations
export function useFormMutation<
  TFormData extends Record<string, any>,
  TMutationVariables extends Record<string, any>,
  TMutationResult extends Record<string, any>
>(
  mutation: (variables: TMutationVariables) => Promise<{ data: TMutationResult }>,
  {
    mapFormToVariables,
    onSuccess,
    onError
  }: {
    mapFormToVariables: (formData: TFormData) => TMutationVariables;
    onSuccess?: (data: TMutationResult) => void;
    onError?: (error: any) => void;
  }
) {
  const [loading, setLoading] = React.useState(false);
  const [mutationResult, setMutationResult] = React.useState<TMutationResult | null>(null);
  const [error, setError] = React.useState<any>(null);

  const execute = async (formData: TFormData) => {
    setLoading(true);
    setError(null);
    
    try {
      const variables = mapFormToVariables(formData);
      const { data } = await mutation(variables);
      setMutationResult(data);
      if (onSuccess) onSuccess(data);
      return data;
    } catch (err) {
      setError(err);
      if (onError) onError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    execute,
    loading,
    data: mutationResult,
    error
  };
}

// 4. Example of a form field adapter that handles GraphQL enum values
export function EnumSelectField<T extends string>({
  name,
  label,
  options,
  required = false
}: FormFieldProps & {
  options: Array<{ value: T; label: string }>;
}) {
  const { control, formState: { errors } } = useFormContext();
  const error = errors[name];

  return (
    <Controller
      name={name}
      control={control}
      render={({ field }) => (
        <FormControl fullWidth error={!!error} required={required}>
          <TextField
            {...field}
            select
            label={label}
            SelectProps={{
              native: true
            }}
          >
            <option value="" disabled>Select {label}</option>
            {options.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </TextField>
          {error && <FormHelperText>{error.message as string}</FormHelperText>}
        </FormControl>
      )}
    />
  );
}

// 5. Handle form initialization from GraphQL query data
export function useInitializeFormFromQuery<T extends Record<string, any>>(
  queryData: T | null | undefined,
  transform?: (data: T) => Record<string, any>
) {
  const [initialValues, setInitialValues] = React.useState<Record<string, any>>({});

  React.useEffect(() => {
    if (queryData) {
      if (transform) {
        setInitialValues(transform(queryData));
      } else {
        setInitialValues(queryData);
      }
    }
  }, [queryData, transform]);

  return initialValues;
}

// 6. Create form section components for complex forms
interface FormSectionProps {
  title: string;
  description?: string;
  children: React.ReactNode;
}

export const FormSection: React.FC<FormSectionProps> = ({
  title,
  description,
  children
}) => {
  return (
    <div className="form-section">
      <h3>{title}</h3>
      {description && <p>{description}</p>}
      <div className="form-section-content">
        {children}
      </div>
    </div>
  );
};