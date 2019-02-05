export enum PermissionLevel {
  General,
  AdminOnly,
  BotManagerOnly,
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
    case PermissionLevel.BotManagerOnly:
      return 'bot manager';
  }
}
