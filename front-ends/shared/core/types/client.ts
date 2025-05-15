import { Address, BaseEntity, ContactInfo, ID, Status } from './common';

export enum ClientType {
  INDIVIDUAL = 'individual',
  CORPORATE = 'corporate',
  GROUP = 'group',
}

export enum Gender {
  MALE = 'male',
  FEMALE = 'female',
  OTHER = 'other',
}

export enum MaritalStatus {
  SINGLE = 'single',
  MARRIED = 'married',
  DIVORCED = 'divorced',
  WIDOWED = 'widowed',
  OTHER = 'other',
}

export interface ClientIdentifier {
  id: ID;
  clientId: ID;
  documentTypeId: number;
  documentType?: string;
  documentKey: string;
  description?: string;
  status?: Status;
}

export interface ClientDocument {
  id: ID;
  clientId: ID;
  name: string;
  description?: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  uploadDate: Date | string;
  url: string;
}

export interface Client extends BaseEntity {
  accountNo?: string;
  externalId?: string;
  status: Status;
  subStatus?: string;
  type: ClientType;
  
  // Individual client properties
  firstName?: string;
  middleName?: string;
  lastName?: string;
  fullName?: string;
  displayName: string;
  dateOfBirth?: Date | string;
  gender?: Gender;
  maritalStatus?: MaritalStatus;
  nationalId?: string;
  
  // Corporate client properties
  legalFormId?: number;
  legalForm?: string;
  companyName?: string;
  incorporationDate?: Date | string;
  incorporationNumber?: string;
  
  // Common properties
  mobileNo?: string;
  emailAddress?: string;
  phone?: string;
  
  // Office information
  officeId: number;
  officeName?: string;
  staffId?: number;
  staffName?: string;
  
  // Additional information
  activationDate?: Date | string;
  submittedOnDate?: Date | string;
  closedOnDate?: Date | string;
  rejectDate?: Date | string;
  withdrawnOnDate?: Date | string;
  timeline?: any;
  savingsAccountId?: number;
  savingsProductId?: number;
  
  // Extended information
  address?: Address;
  contact?: ContactInfo;
  identifiers?: ClientIdentifier[];
  documents?: ClientDocument[];
}

export interface ClientSearchParams {
  name?: string;
  accountNo?: string;
  externalId?: string;
  status?: Status;
  officeId?: number;
  staffId?: number;
  type?: ClientType;
  fromDate?: Date | string;
  toDate?: Date | string;
}