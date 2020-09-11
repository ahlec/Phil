import Member from '@phil/discord/Member';
import Role from '@phil/discord/Role';

import Database from './database';

export interface RequestableCreationDefinition {
  name: string;
  role: Role;
}

interface Result {
  message: string;
  success: boolean;
}

type CanRequestDetermination =
  | {
      allowed: true;
    }
  | {
      allowed: false;
      reason: 'on-blacklist' | 'already-have-role';
    };

class Requestable {
  public static checkIsValidRequestableName(name: string): boolean {
    // Only alphanumeric (with dashes) and must be 2+ characters in length
    return /^[A-Za-z0-9-]{2,}$/.test(name);
  }

  public constructor(
    private readonly database: Database,
    public readonly role: Role,
    public readonly requestStrings: readonly string[],
    private readonly mutableBlacklistedUserIds: Set<string>,
    private readonly serverId: string
  ) {}

  public get blacklistedUserIds(): ReadonlySet<string> {
    return this.mutableBlacklistedUserIds;
  }

  public async addToBlacklist(userId: string): Promise<Result> {
    if (this.blacklistedUserIds.has(userId)) {
      return {
        message: 'User is already on the blacklist for this requestable',
        success: false,
      };
    }

    try {
      const numRowsModified = await this.database.execute(
        `INSERT INTO
          requestable_blacklist(
            user_id,
            server_id,
            role_id
          )
        VALUES($1, $2, $3)`,
        [userId, this.serverId, this.role.id]
      );
      if (numRowsModified !== 1) {
        return {
          message: 'Could not add user to the blacklist',
          success: false,
        };
      }
    } catch (e) {
      return { message: e.message, success: false };
    }

    this.mutableBlacklistedUserIds.add(userId);
    return { message: '', success: true };
  }

  public async determineRequestability(
    member: Member
  ): Promise<CanRequestDetermination> {
    if (this.blacklistedUserIds.has(member.user.id)) {
      return {
        allowed: false,
        reason: 'on-blacklist',
      };
    }

    const existingRole = member.roles.find(
      (role): boolean => role.id === this.role.id
    );
    if (existingRole) {
      return {
        allowed: false,
        reason: 'already-have-role',
      };
    }

    return {
      allowed: true,
    };
  }

  public async removeFromBlacklist(userId: string): Promise<Result> {
    if (!this.blacklistedUserIds.has(userId)) {
      return {
        message: 'User is not on the blacklist for this requestable',
        success: false,
      };
    }

    try {
      const numRowsModified = await this.database.execute(
        `DELETE FROM
          requestable_blacklist
         WHERE
          user_id = $1 AND
          server_id = $2 AND
          role_id = $3`,
        [userId, this.serverId, this.role.id]
      );
      if (numRowsModified !== 1) {
        return {
          message: 'Could not remove user from the blacklist',
          success: false,
        };
      }
    } catch (e) {
      return { message: e.message, success: false };
    }

    this.mutableBlacklistedUserIds.delete(userId);
    return { message: '', success: true };
  }

  public async toggleUserBlacklist(userId: string): Promise<Result> {
    if (this.mutableBlacklistedUserIds.has(userId)) {
      return this.removeFromBlacklist(userId);
    }

    return this.addToBlacklist(userId);
  }
}

export default Requestable;
