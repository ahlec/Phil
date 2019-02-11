import { Role as DiscordIORole, Server as DiscordIOServer } from 'discord.io';
import Database from './database';

export interface RequestableCreationDefinition {
  name: string;
  role: DiscordIORole;
}

function groupRequestStrings(
  results: Array<{ role_id: string; request_string: string }>
): { [roleId: string]: string[] } {
  const groupedRequestStrings: { [roleId: string]: string[] } = {};
  for (const { role_id, request_string } of results) {
    let group = groupedRequestStrings[role_id];
    if (!group) {
      group = [];
      groupedRequestStrings[role_id] = group;
    }

    group.push(request_string);
  }

  return groupedRequestStrings;
}

function groupBlacklist(
  rows: Array<{ role_id: string; user_id: string }>
): { [roleId: string]: Set<string> | undefined } {
  const groups: { [roleId: string]: Set<string> | undefined } = {};

  for (const { role_id, user_id } of rows) {
    let role = groups[role_id];
    if (!role) {
      role = new Set<string>();
      groups[role_id] = role;
    }

    role.add(user_id);
  }

  return groups;
}

export default class Requestable {
  public static checkIsValidRequestableName(name: string): boolean {
    // Only alphanumeric (with dashes) and must be 2+ characters in length
    return /^[A-Za-z0-9\-]{2,}$/.test(name);
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
      if (!requestStrings.hasOwnProperty(roleId)) {
        continue;
      }

      const role = server.roles[roleId];
      if (role === undefined || role === null) {
        continue;
      }

      const blacklist = blacklistLookup[roleId] || new Set<string>();

      requestables.push(
        new Requestable(role, requestStrings[roleId], blacklist)
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
    )).toReadonlySet(({ user_id }) => user_id);

    return new Requestable(role, [], blacklist); // TODO: We need to get the list of request strings here!!
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
    public readonly blacklistedUserIds: ReadonlySet<string>
  ) {}
}
