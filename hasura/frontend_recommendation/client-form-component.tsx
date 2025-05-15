import React from 'react';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { 
  TextField, 
  Button, 
  Grid, 
  FormControl, 
  InputLabel, 
  Select, 
  MenuItem, 
  FormHelperText,
  CircularProgress
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';

// Import generated types
import { 
  useClientCreateMutation, 
  ClientCreateInput,
  ClientActionResponse
} from '../generated/graphql';

// Import type mapping utilities
import { formatDateForAPI } from '../utils/type-mapping';

// Define validation schema using Yup
const clientFormSchema = yup.object({
  officeId: yup.string().required('Office is required'),
  firstname: yup.string().required('First name is required'),
  lastname: yup.string().required('Last name is required'),
  mobileNo: yup.string(),
  emailAddress: yup.string().email('Invalid email address'),
  dateOfBirth: yup.date().nullable(),
  gender: yup.string(),
  active: yup.boolean(),
  activationDate: yup.date().nullable().when('active', {
    is: true,
    then: (schema) => schema.required('Activation date is required when client is active')
  }),
});

type ClientFormValues = yup.InferType<typeof clientFormSchema>;

interface ClientFormProps {
  onSuccess?: (response: ClientActionResponse) => void;
  onError?: (error: any) => void;
  offices: Array<{ id: string, name: string }>;
}

export const ClientForm: React.FC<ClientFormProps> = ({ 
  onSuccess, 
  onError,
  offices = []
}) => {
  const { 
    control, 
    handleSubmit, 
    watch,
    formState: { errors } 
  } = useForm<ClientFormValues>({
    resolver: yupResolver(clientFormSchema),
    defaultValues: {
      active: false,
    }
  });

  const [createClient, { loading }] = useClientCreateMutation({
    onCompleted: (data) => {
      if (onSuccess) onSuccess(data.client_create);
    },
    onError: (error) => {
      if (onError) onError(error);
    }
  });

  const isActive = watch('active');

  const onSubmit = (values: ClientFormValues) => {
    // Transform form values to match GraphQL input type
    const clientInput: ClientCreateInput = {
      ...values,
      // Format dates for API
      dateOfBirth: values.dateOfBirth ? formatDateForAPI(values.dateOfBirth) : undefined,
      activationDate: values.activationDate ? formatDateForAPI(values.activationDate) : undefined,
      // Set submitted date to today
      submittedDate: formatDateForAPI(new Date()),
    };

    createClient({
      variables: {
        input: clientInput
      }
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Controller
            name="officeId"
            control={control}
            render={({ field }) => (
              <FormControl fullWidth error={!!errors.officeId}>
                <InputLabel>Office</InputLabel>
                <Select {...field}>
                  {offices.map(office => (
                    <MenuItem key={office.id} value={office.id}>
                      {office.name}
                    </MenuItem>
                  ))}
                </Select>
                {errors.officeId && (
                  <FormHelperText>{errors.officeId.message}</FormHelperText>
                )}
              </FormControl>
            )}
          />
        </Grid>
        
        <Grid item xs={12} md={6}>
          <Controller
            name="firstname"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label="First Name"
                fullWidth
                error={!!errors.firstname}
                helperText={errors.firstname?.message}
              />
            )}
          />
        </Grid>

        <Grid item xs={12} md={6}>
          <Controller
            name="lastname"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label="Last Name"
                fullWidth
                error={!!errors.lastname}
                helperText={errors.lastname?.message}
              />
            )}
          />
        </Grid>

        <Grid item xs={12} md={6}>
          <Controller
            name="mobileNo"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label="Mobile Number"
                fullWidth
                error={!!errors.mobileNo}
                helperText={errors.mobileNo?.message}
              />
            )}
          />
        </Grid>

        <Grid item xs={12} md={6}>
          <Controller
            name="emailAddress"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label="Email Address"
                fullWidth
                error={!!errors.emailAddress}
                helperText={errors.emailAddress?.message}
              />
            )}
          />
        </Grid>

        <Grid item xs={12} md={6}>
          <LocalizationProvider dateAdapter={AdapterDateFns}>
            <Controller
              name="dateOfBirth"
              control={control}
              render={({ field }) => (
                <DatePicker
                  label="Date of Birth"
                  value={field.value}
                  onChange={field.onChange}
                  slotProps={{
                    textField: {
                      fullWidth: true,
                      error: !!errors.dateOfBirth,
                      helperText: errors.dateOfBirth?.message
                    }
                  }}
                />
              )}
            />
          </LocalizationProvider>
        </Grid>

        <Grid item xs={12} md={6}>
          <Controller
            name="gender"
            control={control}
            render={({ field }) => (
              <FormControl fullWidth>
                <InputLabel>Gender</InputLabel>
                <Select {...field}>
                  <MenuItem value="M">Male</MenuItem>
                  <MenuItem value="F">Female</MenuItem>
                  <MenuItem value="O">Other</MenuItem>
                </Select>
              </FormControl>
            )}
          />
        </Grid>

        <Grid item xs={12} md={6}>
          <Controller
            name="active"
            control={control}
            render={({ field }) => (
              <FormControl>
                <InputLabel>Client Status</InputLabel>
                <Select
                  {...field}
                  value={field.value ? 'active' : 'pending'}
                  onChange={(e) => field.onChange(e.target.value === 'active')}
                >
                  <MenuItem value="pending">Pending</MenuItem>
                  <MenuItem value="active">Active</MenuItem>
                </Select>
              </FormControl>
            )}
          />
        </Grid>

        {isActive && (
          <Grid item xs={12} md={6}>
            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <Controller
                name="activationDate"
                control={control}
                render={({ field }) => (
                  <DatePicker
                    label="Activation Date"
                    value={field.value}
                    onChange={field.onChange}
                    slotProps={{
                      textField: {
                        fullWidth: true,
                        error: !!errors.activationDate,
                        helperText: errors.activationDate?.message
                      }
                    }}
                  />
                )}
              />
            </LocalizationProvider>
          </Grid>
        )}

        <Grid item xs={12} display="flex" justifyContent="flex-end">
          <Button 
            type="submit" 
            variant="contained" 
            color="primary" 
            disabled={loading}
          >
            {loading ? <CircularProgress size={24} /> : 'Create Client'}
          </Button>
        </Grid>
      </Grid>
    </form>
  );
};