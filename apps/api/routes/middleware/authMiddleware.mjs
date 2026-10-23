
import { 
    verifyToken, 
    hasRole, 
    hasPermission, 
    ROLES 
  } from '../utils/authorization.mjs';
  
  /**
   * Require authentication (any logged-in user)
   */
  export function requireAuth(handler) {
    return async (event) => {
      try {
        const authHeader = event.headers?.authorization || event.headers?.Authorization;
        const user = verifyToken(authHeader);
        
        // Add user to event for downstream use
        event.user = user;
        
        
        return await handler(event);
      } catch (error) {
        console.error('❌ Authentication failed:', error.message);
        return {
          statusCode: 401,
          headers: { 
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*" 
          },
          body: JSON.stringify({
            message: 'Unauthorized',
            error: error.message
          })
        };
      }
    };
  }
  
  /**
   * Require specific role
   */
  export function requireRole(requiredRole) {
    return (handler) => {
      return async (event) => {
        try {
          const authHeader = event.headers?.authorization || event.headers?.Authorization;
          const user = verifyToken(authHeader);
          
          if (!hasRole(user, requiredRole)) {
            console.warn(`⚠️ Access denied for ${user.email}: requires ${requiredRole}, has ${user.role}`);
            return {
              statusCode: 403,
              headers: { 
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*" 
              },
              body: JSON.stringify({
                message: 'Forbidden',
                error: `Requires role: ${requiredRole}`,
                userRole: user.role
              })
            };
          }
          
          event.user = user;
          
          return await handler(event);
        } catch (error) {
          console.error('❌ Authorization failed:', error.message);
          return {
            statusCode: 401,
            headers: { 
              "Content-Type": "application/json",
            //   "Access-Control-Allow-Origin": "*" 
            },
            body: JSON.stringify({
              message: 'Unauthorized',
              error: error.message
            })
          };
        }
      };
    };
  }
  
  /**
   * Require specific permission
   */
  export function requirePermission(requiredPermission) {
    return (handler) => {
      return async (event) => {
        try {
          const authHeader = event.headers?.authorization || event.headers?.Authorization;
          const user = verifyToken(authHeader);
          
          if (!hasPermission(user, requiredPermission)) {
            console.warn(` Access denied for ${user.email}: missing permission ${requiredPermission}`);
            return {
              statusCode: 403,
              headers: { 
                "Content-Type": "application/json",
                // "Access-Control-Allow-Origin": "*" 
              },
              body: JSON.stringify({
                message: 'Forbidden',
                error: `Missing required permission: ${requiredPermission}`,
                userRole: user.role
              })
            };
          }
          
          event.user = user;
          
          return await handler(event);
        } catch (error) {
          console.error('❌ Authorization failed:', error.message);
          return {
            statusCode: 401,
            headers: { 
              "Content-Type": "application/json",
            //   "Access-Control-Allow-Origin": "*" 
            },
            body: JSON.stringify({
              message: 'Unauthorized',
              error: error.message
            })
          };
        }
      };
    };
  }
  
  /**
   * Super Admin only
   */
  export function requireSuperAdmin(handler) {
    return requireRole(ROLES.SUPER_ADMIN)(handler);
  }
  
  /**
   * Admin or Super Admin
   */
  export function requireAdmin(handler) {
    return requireRole(ROLES.ADMIN)(handler);
  }
  