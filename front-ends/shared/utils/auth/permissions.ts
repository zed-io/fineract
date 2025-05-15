/**
 * Shared permission utilities
 * These functions handle user permissions and access control
 */

// Permission types
export enum PermissionType {
  READ = 'READ',
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  APPROVE = 'APPROVE',
  REJECT = 'REJECT',
}

// Resource types
export enum ResourceType {
  CLIENTS = 'CLIENTS',
  GROUPS = 'GROUPS',
  LOANS = 'LOANS',
  SAVINGS = 'SAVINGS',
  REPORTS = 'REPORTS',
  USERS = 'USERS',
  ROLES = 'ROLES',
  PRODUCTS = 'PRODUCTS',
  CHARGES = 'CHARGES',
  CONFIGURATION = 'CONFIGURATION',
  ACCOUNTING = 'ACCOUNTING',
  DATATABLE = 'DATATABLE',
}

/**
 * Permission structure
 */
export interface Permission {
  /** Permission unique identifier */
  id: string | number;
  
  /** Permission type (e.g., READ, CREATE) */
  type: PermissionType;
  
  /** Resource the permission applies to */
  resource: ResourceType;
  
  /** Permission description */
  description?: string;
  
  /** Parent permission ID (if this is a child permission) */
  parentId?: string | number;
  
  /** Code name for this permission */
  code?: string;
}

/**
 * User role structure
 */
export interface Role {
  /** Role unique identifier */
  id: string | number;
  
  /** Role name */
  name: string;
  
  /** Role description */
  description?: string;
  
  /** Permissions included in this role */
  permissions: Permission[];
}

/**
 * Check if a user has a specific permission
 * @param userPermissions List of user permissions
 * @param resource Resource to check
 * @param action Permission type to check
 * @returns True if user has the specified permission
 */
export const hasPermission = (
  userPermissions: Permission[],
  resource: ResourceType,
  action: PermissionType
): boolean => {
  return userPermissions.some(
    permission => permission.resource === resource && permission.type === action
  );
};

/**
 * Check if a user has any of the specified permissions
 * @param userPermissions List of user permissions
 * @param permissionChecks List of resource/action pairs to check
 * @returns True if user has any of the specified permissions
 */
export const hasAnyPermission = (
  userPermissions: Permission[],
  permissionChecks: Array<{ resource: ResourceType; action: PermissionType }>
): boolean => {
  return permissionChecks.some(check => 
    hasPermission(userPermissions, check.resource, check.action)
  );
};

/**
 * Check if a user has all of the specified permissions
 * @param userPermissions List of user permissions
 * @param permissionChecks List of resource/action pairs to check
 * @returns True if user has all of the specified permissions
 */
export const hasAllPermissions = (
  userPermissions: Permission[],
  permissionChecks: Array<{ resource: ResourceType; action: PermissionType }>
): boolean => {
  return permissionChecks.every(check => 
    hasPermission(userPermissions, check.resource, check.action)
  );
};

/**
 * Filter a collection of elements based on permission requirements
 * @param items Collection of items to filter
 * @param userPermissions List of user permissions
 * @param getRequiredPermission Function to get required permission for each item
 * @returns Filtered collection of items
 */
export const filterByPermission = <T>(
  items: T[],
  userPermissions: Permission[],
  getRequiredPermission: (item: T) => { resource: ResourceType; action: PermissionType }
): T[] => {
  return items.filter(item => {
    const requiredPermission = getRequiredPermission(item);
    return hasPermission(
      userPermissions,
      requiredPermission.resource,
      requiredPermission.action
    );
  });
};

/**
 * Get a list of permissions for a given resource
 * @param userPermissions List of user permissions
 * @param resource Resource to filter by
 * @returns List of permissions for the specified resource
 */
export const getResourcePermissions = (
  userPermissions: Permission[],
  resource: ResourceType
): Permission[] => {
  return userPermissions.filter(permission => permission.resource === resource);
};

/**
 * Check if a user has at least read access to a resource
 * @param userPermissions List of user permissions
 * @param resource Resource to check
 * @returns True if user has at least read access
 */
export const canAccessResource = (
  userPermissions: Permission[],
  resource: ResourceType
): boolean => {
  return hasPermission(userPermissions, resource, PermissionType.READ);
};

/**
 * Check if a user has full access (all permission types) to a resource
 * @param userPermissions List of user permissions
 * @param resource Resource to check
 * @returns True if user has full access
 */
export const hasFullAccess = (
  userPermissions: Permission[],
  resource: ResourceType
): boolean => {
  const permissionTypes = Object.values(PermissionType);
  return permissionTypes.every(permissionType => 
    hasPermission(userPermissions, resource, permissionType as PermissionType)
  );
};