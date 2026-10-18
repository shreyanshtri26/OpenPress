
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET

export const ROLES = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  EDITOR: 'editor',
  JOURNALIST: 'journalist',
  CONTRIBUTOR: 'contributor',
  VIEWER: 'viewer'
};

export const ROLE_LEVELS = {
  [ROLES.SUPER_ADMIN]: 100,
  [ROLES.ADMIN]: 80,
  [ROLES.EDITOR]: 60,
  [ROLES.JOURNALIST]: 40,
  [ROLES.CONTRIBUTOR]: 20,
  [ROLES.VIEWER]: 10
};


export const PERMISSIONS = {
  // User management
  CREATE_USER: 'create_user',
  READ_USER: 'read_user',
  UPDATE_USER: 'update_user',
  DELETE_USER: 'delete_user',
  ASSIGN_ROLES: 'assign_roles',
  SUSPEND_USER: 'suspend_user',
  ACTIVATE_USER: 'activate_user',
  
  // Article management
  CREATE_ARTICLE: 'create_article',
  READ_ARTICLE: 'read_article',
  UPDATE_ARTICLE: 'update_article',
  UPDATE_ANY_ARTICLE: 'update_any_article',
  DELETE_ARTICLE: 'delete_article',
  DELETE_ANY_ARTICLE: 'delete_any_article',
  PUBLISH_ARTICLE: 'publish_article',
  APPROVE_ARTICLE: 'approve_article',
  REVIEW_ARTICLE: 'review_article',
  
  // Story management
  CREATE_STORY: 'create_story',
  READ_STORY: 'read_story',
  UPDATE_STORY: 'update_story',
  UPDATE_ANY_STORY: 'update_any_story',
  DELETE_STORY: 'delete_story',
  DELETE_ANY_STORY: 'delete_any_story',
  PUBLISH_STORY: 'publish_story',
  APPROVE_STORY: 'approve_story',
  
  // Asset management (DAM)
  CREATE_ASSET: 'create_asset',
  READ_ASSET: 'read_asset',
  UPDATE_ASSET: 'update_asset',
  DELETE_ASSET: 'delete_asset',
  
  // System settings
  MANAGE_SETTINGS: 'manage_settings',
  VIEW_ANALYTICS: 'view_analytics',
  MANAGE_CATEGORIES: 'manage_categories',
  SYSTEM_ADMIN: 'system_admin'
};

// ROLE-PERMISSION MAPPING
export const ROLE_PERMISSIONS = {
  [ROLES.SUPER_ADMIN]: Object.values(PERMISSIONS), 
  
  [ROLES.ADMIN]: [
    PERMISSIONS.CREATE_USER,
    PERMISSIONS.READ_USER,
    PERMISSIONS.UPDATE_USER,
    PERMISSIONS.DELETE_USER,
    PERMISSIONS.CREATE_ARTICLE,
    PERMISSIONS.READ_ARTICLE,
    PERMISSIONS.UPDATE_ARTICLE,
    PERMISSIONS.UPDATE_ANY_ARTICLE,
    PERMISSIONS.DELETE_ARTICLE,
    PERMISSIONS.DELETE_ANY_ARTICLE,
    PERMISSIONS.PUBLISH_ARTICLE,
    PERMISSIONS.APPROVE_ARTICLE,
    PERMISSIONS.REVIEW_ARTICLE,
    PERMISSIONS.CREATE_STORY,
    PERMISSIONS.READ_STORY,
    PERMISSIONS.UPDATE_STORY,
    PERMISSIONS.UPDATE_ANY_STORY,
    PERMISSIONS.DELETE_STORY,
    PERMISSIONS.DELETE_ANY_STORY,
    PERMISSIONS.PUBLISH_STORY,
    PERMISSIONS.APPROVE_STORY,
    PERMISSIONS.CREATE_ASSET,
    PERMISSIONS.READ_ASSET,
    PERMISSIONS.UPDATE_ASSET,
    PERMISSIONS.DELETE_ASSET,
    PERMISSIONS.VIEW_ANALYTICS,
    PERMISSIONS.MANAGE_CATEGORIES
  ],
  
  [ROLES.EDITOR]: [
    PERMISSIONS.READ_USER,
    PERMISSIONS.CREATE_ARTICLE,
    PERMISSIONS.READ_ARTICLE,
    PERMISSIONS.UPDATE_ARTICLE,
    PERMISSIONS.UPDATE_ANY_ARTICLE,
    PERMISSIONS.PUBLISH_ARTICLE,
    PERMISSIONS.APPROVE_ARTICLE,
    PERMISSIONS.REVIEW_ARTICLE,
    PERMISSIONS.CREATE_STORY,
    PERMISSIONS.READ_STORY,
    PERMISSIONS.UPDATE_STORY,
    PERMISSIONS.UPDATE_ANY_STORY,
    PERMISSIONS.PUBLISH_STORY,
    PERMISSIONS.APPROVE_STORY,
    PERMISSIONS.CREATE_ASSET,
    PERMISSIONS.READ_ASSET,
    PERMISSIONS.UPDATE_ASSET
  ],
  
  [ROLES.JOURNALIST]: [
    PERMISSIONS.READ_USER,
    PERMISSIONS.CREATE_ARTICLE,
    PERMISSIONS.READ_ARTICLE,
    PERMISSIONS.UPDATE_ARTICLE,
    PERMISSIONS.CREATE_STORY,
    PERMISSIONS.READ_STORY,
    PERMISSIONS.UPDATE_STORY,
    PERMISSIONS.CREATE_ASSET,
    PERMISSIONS.READ_ASSET
  ],
  
  [ROLES.CONTRIBUTOR]: [
    PERMISSIONS.READ_USER,
    PERMISSIONS.CREATE_ARTICLE,
    PERMISSIONS.READ_ARTICLE,
    PERMISSIONS.CREATE_STORY,
    PERMISSIONS.READ_STORY,
    PERMISSIONS.READ_ASSET
  ],
  
  [ROLES.VIEWER]: [
    PERMISSIONS.READ_ARTICLE,
    PERMISSIONS.READ_STORY,
    PERMISSIONS.READ_ASSET
  ]
};

// HELPER FUNCTIONS

/**
 * Verify JWT token and extract user data
 */
export function verifyToken(authHeader) {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('No authorization token provided');
  }

  const token = authHeader.split(' ')[1];
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    return decoded;
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new Error('Token has expired');
    }
    throw new Error('Invalid token');
  }
}

/**
 * Check if user has required role
 */
export function hasRole(user, requiredRole) {
  if (!user || !user.role) {
    return false;
  }
  
  const userLevel = ROLE_LEVELS[user.role] || 0;
  const requiredLevel = ROLE_LEVELS[requiredRole] || 0;
  
  return userLevel >= requiredLevel;
}

/**
 * Get base permissions for a role
 */
export function getRolePermissions(role) {
  return ROLE_PERMISSIONS[role] || [];
}

/**
 * Calculate final permissions (role + custom overrides)
 */
export function calculateFinalPermissions(user) {
  if (!user || !user.role) {
    return [];
  }
  
  // Start with role-based permissions
  let permissions = [...getRolePermissions(user.role)];
  
  // Apply custom restrictions if they exist
  if (user.restrictions) {
    // Remove disabled permissions
    if (user.restrictions.disabledPermissions) {
      permissions = permissions.filter(
        p => !user.restrictions.disabledPermissions.includes(p)
      );
    }
    
    // Add enabled permissions
    if (user.restrictions.enabledPermissions) {
      permissions = [
        ...permissions,
        ...user.restrictions.enabledPermissions
      ];
    }
  }
  
  // Remove duplicates
  return [...new Set(permissions)];
}

/**
 * Check if user has required permission
 */
export function hasPermission(user, requiredPermission) {
  if (!user || !user.role) {
    return false;
  }
  
  // Super admin has all permissions
  if (user.role === ROLES.SUPER_ADMIN) {
    return true;
  }
  
  // Get final permissions (role + restrictions)
  const finalPermissions = user.finalPermissions || calculateFinalPermissions(user);
  
  return finalPermissions.includes(requiredPermission);
}

/**
 * Check if user has any of the required permissions
 */
export function hasAnyPermission(user, requiredPermissions) {
  if (!user || !user.role) {
    return false;
  }
  
  if (user.role === ROLES.SUPER_ADMIN) {
    return true;
  }
  
  return requiredPermissions.some(permission => hasPermission(user, permission));
}

/**
 * Check if user has all required permissions
 */
export function hasAllPermissions(user, requiredPermissions) {
  if (!user || !user.role) {
    return false;
  }
  
  if (user.role === ROLES.SUPER_ADMIN) {
    return true;
  }
  
  return requiredPermissions.every(permission => hasPermission(user, permission));
}

/**
 * Check if user owns the resource
 */
export function isOwner(user, resource) {
  if (!user || !resource) {
    return false;
  }
  
  return resource.userId === user.userId || 
         resource.authorId === user.userId ||
         resource.createdBy === user.userId ||
         resource.email === user.email;
}

/**
 * Generate JWT token
 */
export function generateToken(user) {
  const finalPermissions = calculateFinalPermissions(user);
  
  const payload = {
    userId: user.userId,
    email: user.email,
    role: user.role,
    restrictions: user.restrictions || null,
    finalPermissions: finalPermissions,
    isRestricted: !!(user.restrictions && (
      user.restrictions.disabledPermissions?.length > 0 ||
      user.restrictions.scopeRestrictions
    ))
  };
  
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });
}

/**
 * Check account status
 */
export function checkAccountStatus(user) {
  // Check if suspended
  if (user.isSuspended) {
    return {
      valid: false,
      error: 'Account suspended',
      details: {
        reason: user.restrictionReason,
        suspendedBy: user.restrictedBy,
        suspendedAt: user.restrictedAt
      }
    };
  }
  
  // Check if inactive
  if (user.isActive === false) {
    return {
      valid: false,
      error: 'Account inactive',
      details: {
        reason: 'Account has been deactivated'
      }
    };
  }
  
  // Check if expired
  if (user.accountExpiresAt) {
    const expiryDate = new Date(user.accountExpiresAt);
    const now = new Date();
    
    if (expiryDate < now) {
      return {
        valid: false,
        error: 'Account expired',
        details: {
          expiredAt: user.accountExpiresAt
        }
      };
    }
  }
  
  return { valid: true };
}
