export enum PermissionLevel {
  General,
  AdminOnly,
}

export default PermissionLevel;

export function getPermissionLevelName(
  permissionLevel: PermissionLevel
): string {
  switch (permissionLevel) {
    case PermissionLevel.General:
      return 'general';
    case PermissionLevel.AdminOnly:
      return 'admin';
  }
}
