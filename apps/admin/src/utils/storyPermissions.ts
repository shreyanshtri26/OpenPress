/**
 * Shared Story Permission Checker
 * Used across multiple components (KanbanBoard, RaiseStory, StoryHeader)
 */

import { RolePermissions } from '../context/UserContext';

/**
 * Check if a user has permission to perform an action on a story at a given status
 * Includes role-specific logic for different story statuses
 */
export const checkStoryPermission = (
  permissions: RolePermissions | null,
  status: string,
  action: 'Create' | 'Open' | 'Edit' | 'Decide',
  userRole?: string
): boolean => {
  console.log("inside check story permission ...", permissions, status, action, userRole);
  if (!permissions) return false;
  if (!status) return true;

  const isSuperUser = userRole?.toLowerCase() === 'super user';
  if (isSuperUser) return true;

  // Map status to editorial section rows
  const statusMap: Record<string, string> = {
    'raise_a_story': 'Raise a story',
    'ideas': 'Ideas',
    'in_progress': 'In progress',
    'in_review': 'In review',
    'ready_to_publish': 'Ready to publish',
    'published': 'Published',
  };
  console.log("status map ...", statusMap);

  const permissionKey = statusMap[status.toLowerCase().replace(/ /g, '_')];
  console.log("permission key ...", permissions?.editorial?.[permissionKey]?.[action]);
  if (!permissionKey) return false;

  // Helper to detect role
  // const isReporter = !!(userRole && (
  //   userRole.toLowerCase().includes('journalist') ||
  //   userRole.toLowerCase().includes('author') ||
  //   userRole.toLowerCase().includes('reporter')
  // ));
  // const isEditor = !!(userRole && userRole.toLowerCase().includes('editor'));

  // ✨ ROLE-SPECIFIC LOGIC: 
  // For in_progress: reporter can open/edit/decide (submit), editor can open (view only)
  // if (status?.toLowerCase() === 'in_progress') {
  //   if (action === 'Open') {
  //     // Both reporter and editor can open in_progress stories
  //     return isReporter || isEditor;
  //   }
  //   if (action === 'Edit') {
  //     // Only reporter can edit in_progress stories
  //     return isReporter;
  //   }
  //   if (action === 'Decide') {
  //     // Only reporter can decide/submit in in_progress
  //     return isReporter;
  //   }
  // }

  // For in_review: editor can edit and decide, reporter can view only
  // if (status?.toLowerCase() === 'in_review') {
  //   if (action === 'Open') {
  //     // Both reporter and editor can open in_review stories
  //     return isReporter || isEditor;
  //   }
  //   if (action === 'Edit') {
  //     // Only editor can edit in_review stories for review/refinement
  //     return isEditor;
  //   }
  //   if (action === 'Decide') {
  //     // Only editor can decide (approve/hold/reject)
  //     return isEditor;
  //   }
  // }

  // For other statuses: use standard permission check
  return permissions?.editorial?.[permissionKey]?.[action] ?? false;
};
