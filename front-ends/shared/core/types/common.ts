/**
 * Common types shared across the applications
 */

export interface PaginationOptions {
  page: number;
  limit: number;
  total?: number;
}

export interface SortOptions {
  field: string;
  direction: 'asc' | 'desc';
}

export interface FilterOption {
  field: string;
  operator: 'eq' | 'neq' | 'gt' | 'lt' | 'gte' | 'lte' | 'contains' | 'startsWith' | 'endsWith';
  value: string | number | boolean | Date | null;
}

export interface DataQueryOptions {
  pagination?: PaginationOptions;
  sort?: SortOptions[];
  filters?: FilterOption[];
  search?: string;
}

export interface ApiResponse<T> {
  data: T;
  status: number;
  message?: string;
  meta?: {
    pagination?: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    };
  };
}

export interface SelectOption {
  label: string;
  value: string | number;
  disabled?: boolean;
  group?: string;
}

export enum Status {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  PENDING = 'pending',
  REJECTED = 'rejected',
  APPROVED = 'approved',
  CLOSED = 'closed',
}

export interface Address {
  street: string;
  city: string;
  state?: string;
  postalCode: string;
  country: string;
  addressLine1?: string;
  addressLine2?: string;
  addressLine3?: string;
  addressTypeId?: number;
}

export interface ContactInfo {
  email?: string;
  phone?: string;
  mobileNo?: string;
  alternatePhone?: string;
}

export type ID = string | number;

export interface AuditFields {
  createdBy?: string;
  createdDate?: Date | string;
  lastModifiedBy?: string;
  lastModifiedDate?: Date | string;
}

export interface BaseEntity extends AuditFields {
  id: ID;
}