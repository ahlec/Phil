import { Role as DiscordIORole, Server as DiscordIOServer } from 'discord.io';
import Database from './database';

export interface RequestableCreationDefinition {
  name: string;
  role: DiscordIORole;
}

interface Result {
  message: string;
  success: boolean;
}

function groupRequestStrings(
  results: Array<{ role_id: string; request_string: string }>
): { [roleId: string]: string[] } {
  const groupedRequestStrings: { [roleId: string]: string[] } = {};
  for (const { role_id: roleId, request_string: requestString } of results) {
    let group = groupedRequestStrings[roleId];
    if (!group) {
      group = [];
      groupedRequestStrings[roleId] = group;
    }

    group.push(requestString);
  }

  return groupedRequestStrings;
}

function groupBlacklist(
  rows: Array<{ role_id: string; user_id: string }>
): { [roleId: string]: Set<string> | undefined } {
  const groups: { [roleId: string]: Set<string> | undefined } = {};

  for (const { role_id: roleId, user_id: userId } of rows) {
    let role = groups[roleId];
    if (!role) {
      role = new Set<string>();
      groups[roleId] = role;
    }

    role.add(userId);
  }

  return groups;
}

export default class Requestable {
  public static checkIsValidRequestableName(name: string): boolean {
    // Only alphanumeric (with dashes) and must be 2+ characters in length
    return /^[A-Za-z0-9-]{2,}$/.test(name);
  }

  public static async getAllRequestables(
    db: Database,
    server: DiscordIOServer
  ): Promise<Requestable[]> {
    const requestStrings = (await db.query(
      'SELECT request_string, role_id FROM requestable_roles WHERE server_id = $1',
      [server.id]
    )).transform(groupRequestStrings);
    const blacklistLookup = (await db.query(
      'SELECT user_id, role_id FROM requestable_blacklist WHERE server_id = $1',
      [server.id]
    )).transform(groupBlacklist);
    const requestables = [];
    for (const roleId in requestStrings) {
      const role = server.roles[roleId];
      if (role === undefined || role === null) {
        continue;
      }

      const blacklist = blacklistLookup[roleId] || new Set<string>();

      requestables.push(
        new Requestable(role, requestStrings[roleId], blacklist, server.id)
      );
    }

    return requestables;
  }

  public static async getFromRequestString(
    db: Database,
    server: DiscordIOServer,
    requestString: string
  ): Promise<Requestable | null> {
    requestString = requestString.toLowerCase();
    const results = await db.query<{ role_id: string }>(
      'SELECT role_id FROM requestable_roles WHERE request_string = $1 AND server_id = $2',
      [requestString, server.id]
    );

    if (results.rowCount === 0) {
      return null;
    }

    const roleId = results.rows[0].role_id;
    const role = server.roles[roleId];
    if (!role || role === null) {
      throw new Error(
        'There is still a requestable role by the name of `' +
          requestString +
          "` defined for the server, but it doesn't exist anymore in Discord's list of roles. An admin should remove this."
      );
    }

    const blacklist = (await db.query<{ user_id: string }>(
      'SELECT user_id FROM requestable_blacklist WHERE role_id = $1 AND server_id = $2',
      [roleId, server.id]
    )).toSet(({ user_id: userId }) => userId);

    return new Requestable(role, [], blacklist, server.id); // TODO: We need to get the list of request strings here!!
  }

  public static async createRequestable(
    db: Database,
    server: DiscordIOServer,
    info: RequestableCreationDefinition
  ): Promise<void> {
    await db.query('INSERT INTO requestable_roles VALUES($1, $2, $3)', [
      info.name,
      info.role.id,
      server.id,
    ]);
  }

  constructor(
    public readonly role: DiscordIORole,
    public readonly requestStrings: ReadonlyArray<string>,
    private readonly mutableBlacklistedUserIds: Set<string>,
    private readonly serverId: string
  ) {}

  public get blacklistedUserIds(): ReadonlySet<string> {
    return this.mutableBlacklistedUserIds;
  }

  public async addToBlacklist(userId: string, db: Database): Promise<Result> {
    if (this.blacklistedUserIds.has(userId)) {
      return {
        message: 'User is already on the blacklist for this requestable',
        success: false,
      };
    }

    try {
      const numRowsModified = await db.execute(
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

  public async removeFromBlacklist(
    userId: string,
    db: Database
  ): Promise<Result> {
    if (!this.blacklistedUserIds.has(userId)) {
      return {
        message: 'User is not on the blacklist for this requestable',
        success: false,
      };
    }

    try {
      const numRowsModified = await db.execute(
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

  public async toggleUserBlacklist(
    userId: string,
    db: Database
  ): Promise<Result> {
    if (this.mutableBlacklistedUserIds.has(userId)) {
      return this.removeFromBlacklist(userId, db);
    }

    return this.addToBlacklist(userId, db);
  }
}
