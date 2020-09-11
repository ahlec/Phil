import Server from '@phil/discord/Server';
import Role from '@phil/discord/Role';

import Database from './database';
import Requestable from './requestables';

interface RequestableRetrieval {
  type: 'request-string';
  requestString: string;
}

export interface DbRow {
  bucket_id: string;
  server_id: string;
  channel_id: string;
  reference_handle: string;
  display_name: string;
  is_paused: string;
  required_role_id: string;
  alert_when_low: string;
  prompt_title_format: string;
  alerted_bucket_emptying: string;
  frequency: string;
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

class ServerRequestablesCollection {
  public constructor(
    private readonly database: Database,
    private readonly server: Server
  ) {}

  public async getAll(): Promise<readonly Requestable[]> {
    const [requestStrings, blacklist] = await Promise.all([
      this.database.query(
        'SELECT request_string, role_id FROM requestable_roles WHERE server_id = $1',
        [this.server.id]
      ),
      this.database.query(
        'SELECT user_id, role_id FROM requestable_blacklist WHERE server_id = $1',
        [this.server.id]
      ),
    ]);

    const requestStringsLookup = requestStrings.transform(groupRequestStrings);
    const blacklistLookup = blacklist.transform(groupBlacklist);
    const requestables: Requestable[] = [];
    for (const roleId in requestStringsLookup) {
      const role = this.server.getRole(roleId);
      if (!role) {
        continue;
      }

      const blacklist = blacklistLookup[roleId] || new Set<string>();

      requestables.push(
        new Requestable(
          this.database,
          role,
          requestStringsLookup[roleId],
          blacklist,
          this.server.id
        )
      );
    }

    return requestables;
  }

  public async retrieve(
    retrieval: RequestableRetrieval
  ): Promise<Requestable | null> {
    const requestString = retrieval.requestString.toLowerCase();
    const results = await this.database.query<{ role_id: string }>(
      'SELECT role_id FROM requestable_roles WHERE request_string = $1 AND server_id = $2',
      [requestString, this.server.id]
    );

    if (results.rowCount === 0) {
      return null;
    }

    const roleId = results.rows[0].role_id;
    const role = this.server.getRole(roleId);
    if (!role) {
      throw new Error(
        'There is still a requestable role by the name of `' +
          requestString +
          "` defined for the server, but it doesn't exist anymore in Discord's list of roles. An admin should remove this."
      );
    }

    const blacklist = (
      await this.database.query<{ user_id: string }>(
        'SELECT user_id FROM requestable_blacklist WHERE role_id = $1 AND server_id = $2',
        [roleId, this.server.id]
      )
    ).toSet(({ user_id: userId }) => userId);

    return new Requestable(this.database, role, [], blacklist, this.server.id); // TODO: We need to get the list of request strings here!!
  }

  public async create(requestString: string, role: Role): Promise<void> {
    await this.database.query(
      'INSERT INTO requestable_roles VALUES($1, $2, $3)',
      [requestString, role.id, this.server.id]
    );
  }
}

export default ServerRequestablesCollection;
