/**
 * Group management models for Fineract
 */

/**
 * Status types for groups
 */
export enum GroupStatus {
  PENDING = 'pending',
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  CLOSED = 'closed',
  REJECTED = 'rejected',
  SUBMITTED_AND_PENDING_APPROVAL = 'submitted_and_pending_approval',
  APPROVED = 'approved'
}

/**
 * Group role types
 */
export enum GroupRoleType {
  LEADER = 'Leader',
  SECRETARY = 'Secretary',
  TREASURER = 'Treasurer',
  MEMBER = 'Member'
}

/**
 * Group model
 */
export interface Group {
  id?: string;
  officeName?: string;
  officeId: string;
  staffId?: string;
  staffName?: string;
  parentId?: string;
  levelId?: string;
  groupName: string;
  externalId?: string;
  status: GroupStatus;
  activationDate?: Date;
  submittedDate?: Date;
  submitterUserId?: string;
  isCentralizedGroup: boolean;
  hierarchy?: string;
  createdDate?: Date;
  createdBy?: string;
  lastModifiedDate?: Date;
  lastModifiedBy?: string;
  closedDate?: Date;
  closedByUserId?: string;
}

/**
 * Group creation request
 */
export interface GroupCreateRequest {
  groupName: string;
  officeId: string;
  staffId?: string;
  parentId?: string;
  levelId?: string;
  externalId?: string;
  submittedDate?: string; // ISO date string
  activationDate?: string; // ISO date string
  isCentralizedGroup?: boolean;
  clientMembers?: string[]; // Array of client IDs
}

/**
 * Group update request
 */
export interface GroupUpdateRequest {
  groupName?: string;
  officeId?: string;
  staffId?: string;
  externalId?: string;
  isCentralizedGroup?: boolean;
}

/**
 * Group activation request
 */
export interface GroupActivationRequest {
  activationDate: string; // ISO date string
}

/**
 * Group closure request
 */
export interface GroupCloseRequest {
  closureDate: string; // ISO date string
  closureReason?: string;
}

/**
 * Group member model
 */
export interface GroupMember {
  id?: string;
  groupId: string;
  clientId: string;
  clientName?: string;
  accountNo?: string;
  createdDate?: Date;
  createdBy?: string;
  lastModifiedDate?: Date;
  lastModifiedBy?: string;
}

/**
 * Group role assignment model
 */
export interface GroupRole {
  id?: string;
  groupId: string;
  clientId: string;
  clientName?: string;
  roleId: string;
  roleName?: string;
  createdDate?: Date;
  createdBy?: string;
  lastModifiedDate?: Date;
  lastModifiedBy?: string;
}

/**
 * Group member assignment request
 */
export interface GroupMemberAssignRequest {
  groupId: string;
  clientIds: string[];
}

/**
 * Group role assignment request
 */
export interface GroupRoleAssignRequest {
  groupId: string;
  clientId: string;
  roleId: string;
}

/**
 * Group note model
 */
export interface GroupNote {
  id?: string;
  groupId: string;
  note: string;
  createdDate?: Date;
  createdBy?: string;
  lastModifiedDate?: Date;
  lastModifiedBy?: string;
}

/**
 * Group note creation request
 */
export interface GroupNoteCreateRequest {
  groupId: string;
  note: string;
}

/**
 * Group transfer model
 */
export interface GroupTransfer {
  id?: string;
  groupId: string;
  fromOfficeId: string;
  toOfficeId: string;
  transferDate: Date;
  submittedDate: Date;
  submittedBy: string;
  status: GroupStatus;
  description?: string;
  createdDate?: Date;
  createdBy?: string;
  lastModifiedDate?: Date;
  lastModifiedBy?: string;
}

/**
 * Group transfer request
 */
export interface GroupTransferRequest {
  groupId: string;
  destinationOfficeId: string;
  transferDate: string; // ISO date string
  note?: string;
}

/**
 * Group search criteria
 */
export interface GroupSearchCriteria {
  name?: string;
  officeId?: string;
  staffId?: string;
  status?: GroupStatus;
  externalId?: string;
  parentId?: string;
  isParent?: boolean;
}

/**
 * Group list response
 */
export interface GroupListResponse {
  totalFilteredRecords: number;
  pageItems: GroupSummary[];
}

/**
 * Group summary for list view
 */
export interface GroupSummary {
  id: string;
  accountNo: string;
  name: string;
  status: GroupStatus;
  activationDate?: Date;
  officeId: string;
  officeName: string;
  staffId?: string;
  staffName?: string;
  hierarchy?: string;
  levelId?: string;
  levelName?: string;
  parentId?: string;
  parentName?: string;
  memberCount?: number;
  externalId?: string;
}

/**
 * Group detail response with members and roles
 */
export interface GroupDetailResponse {
  group: Group;
  members: GroupMember[];
  roles: GroupRole[];
  notes?: GroupNote[];
  parentGroup?: GroupSummary;
  childGroups?: GroupSummary[];
}

/**
 * Group creation response
 */
export interface GroupCreateResponse {
  officeId: string;
  groupId: string;
  resourceId: string;
}

/**
 * Group deletion request
 */
export interface GroupDeleteRequest {
  groupId: string;
}