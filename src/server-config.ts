import * as discord from 'discord.io';
import Database from './database';
import Logger from './Logger';
import LoggerDefinition from './LoggerDefinition';
import { DEFAULT_PRONOUNS } from './pronouns/definitions';
import Pronoun from './pronouns/pronoun';
import { getPronounFromRole } from './pronouns/utils';

function doesRoleHavePermission(
  role: discord.Role,
  permission: number
): boolean {
  // TODO: Return to this function and determine if it's actually working?
  /* tslint:disable:no-bitwise */
  const binary = (role.permissions >>> 0).toString(2).split('');
  /* tslint:enable:no-bitwise */
  for (const strBit of binary) {
    const bit = parseInt(strBit, 10);
    if (bit === permission) {
      return true;
    }
  }
  return false;
}

interface DbRow {
  server_id: string;
  command_prefix: string;
  bot_control_channel_id: string;
  admin_channel_id: string;
  introductions_channel_id: string;
  news_channel_id: string;
  welcome_message: string;
  fandom_map_link: string;
  admin_role_id: string;
}

export class ServerConfig extends Logger {
  public static async getFromId(
    db: Database,
    server: discord.Server
  ): Promise<ServerConfig | null> {
    const results = await db.query<DbRow>(
      'SELECT * FROM server_configs WHERE server_id = $1',
      [server.id]
    );
    if (results.rowCount === 0) {
      return null;
    }

    return new ServerConfig(server, results.rows[0]);
  }

  public static async initializeDefault(
    db: Database,
    server: discord.Server
  ): Promise<ServerConfig> {
    let botControlChannel = server.channels[server.id];
    if (!botControlChannel) {
      const id = Object.keys(server.channels);
      botControlChannel = server.channels[id[0]];
      if (!botControlChannel) {
        throw new Error('Could not find a suitable initial bot channel');
      }
    }

    const creation = await db.query<DbRow>(
      `INSERT INTO
        server_configs(
          server_id,
          bot_control_channel_id
        )
        VALUES
          ($1, $2)
        RETURNING
          *`,
      [server.id, botControlChannel.id]
    );
    if (!creation.rowCount) {
      throw new Error(
        'Could not initialize the server config within the database.'
      );
    }

    return new ServerConfig(server, creation.rows[0]);
  }

  public readonly serverId: string;
  public readonly fandomMapLink: string | null;
  private commandPrefixInternal: string;
  private botControlChannelInternal: discord.Channel;
  private adminChannelInternal: discord.Channel;
  private introductionsChannelInternal: discord.Channel;
  private newsChannelInternal: discord.Channel;
  private adminRoleInternal: discord.Role;
  private welcomeMessageInternal: string | null;

  private constructor(public readonly server: discord.Server, dbRow: DbRow) {
    super(new LoggerDefinition('Server Config'));

    this.serverId = dbRow.server_id;
    this.commandPrefixInternal = dbRow.command_prefix;
    this.botControlChannelInternal = this.getChannel(
      dbRow.bot_control_channel_id
    );
    this.adminChannelInternal = this.getChannel(dbRow.admin_channel_id);
    this.introductionsChannelInternal = this.getChannel(
      dbRow.introductions_channel_id
    );
    this.newsChannelInternal = this.getChannel(dbRow.news_channel_id);
    this.welcomeMessageInternal = this.getOptionalString(dbRow.welcome_message);
    this.fandomMapLink = this.getOptionalString(dbRow.fandom_map_link);

    if (dbRow.admin_role_id) {
      this.adminRoleInternal = this.server.roles[dbRow.admin_role_id];
    }
  }

  // -----------------------------------------------------------------------------
  // Accessors and mutators
  // -----------------------------------------------------------------------------

  public get commandPrefix(): string {
    return this.commandPrefixInternal;
  }

  public async setCommandPrefix(
    prefix: string,
    database: Database
  ): Promise<boolean> {
    const result = await this.setFieldInDatabase(
      prefix,
      database,
      'command_prefix'
    );
    if (!result) {
      return false;
    }

    this.commandPrefixInternal = prefix;
    return true;
  }

  public get botControlChannel(): discord.Channel {
    return this.botControlChannelInternal;
  }

  public async setBotControlChannel(
    channelId: string,
    database: Database
  ): Promise<boolean> {
    const result = await this.setFieldInDatabase(
      channelId,
      database,
      'bot_control_channel_id'
    );
    if (!result) {
      return false;
    }

    this.botControlChannelInternal = this.server.channels[channelId];
    return true;
  }

  public get adminChannel(): discord.Channel {
    return this.adminChannelInternal;
  }

  public async setAdminChannel(
    channelId: string,
    database: Database
  ): Promise<boolean> {
    const result = await this.setFieldInDatabase(
      channelId,
      database,
      'admin_channel_id'
    );
    if (!result) {
      return false;
    }

    this.adminChannelInternal = this.server.channels[channelId];
    return true;
  }

  public get introductionsChannel(): discord.Channel {
    return this.introductionsChannelInternal;
  }

  public async setIntroductionsChannel(
    channelId: string,
    database: Database
  ): Promise<boolean> {
    const result = await this.setFieldInDatabase(
      channelId,
      database,
      'introductions_channel_id'
    );
    if (!result) {
      return false;
    }

    this.introductionsChannelInternal = this.server.channels[channelId];
    return true;
  }

  public get newsChannel(): discord.Channel {
    return this.newsChannelInternal;
  }

  public async setNewsChannel(
    channelId: string,
    database: Database
  ): Promise<boolean> {
    const result = await this.setFieldInDatabase(
      channelId,
      database,
      'news_channel_id'
    );
    if (!result) {
      return false;
    }

    this.newsChannelInternal = this.server.channels[channelId];
    return true;
  }

  public get adminRole(): discord.Role {
    return this.adminRoleInternal;
  }

  public async setAdminRole(
    roleId: string,
    database: Database
  ): Promise<boolean> {
    const result = await this.setFieldInDatabase(
      roleId,
      database,
      'admin_role_id'
    );
    if (!result) {
      return false;
    }

    this.adminRoleInternal = this.server.roles[roleId];
    return true;
  }

  public get welcomeMessage(): string | null {
    return this.welcomeMessageInternal;
  }

  public async setWelcomeMessage(
    message: string,
    database: Database
  ): Promise<boolean> {
    const result = await this.setFieldInDatabase(
      message,
      database,
      'welcome_message'
    );
    if (!result) {
      return false;
    }

    this.welcomeMessageInternal = message;
    return true;
  }

  // -----------------------------------------------------------------------------
  // Utility functions
  // -----------------------------------------------------------------------------

  public isAdmin(member: discord.Member): boolean {
    for (const memberRoleId of member.roles) {
      if (this.adminRole && this.adminRole.id === memberRoleId) {
        return true;
      }

      const role = this.server.roles[memberRoleId];
      if (
        doesRoleHavePermission(role, discord.Permissions.GENERAL_ADMINISTRATOR)
      ) {
        return true;
      }
    }

    // Check @everyone role
    if (
      doesRoleHavePermission(
        this.server.roles[this.server.id],
        discord.Permissions.GENERAL_ADMINISTRATOR
      )
    ) {
      return true;
    }

    // The owner of the server is also an admin
    return this.server.owner_id === member.id;
  }

  public isAdminChannel(channelId: string): boolean {
    if (!channelId) {
      return false;
    }

    return (
      this.botControlChannel.id === channelId ||
      this.adminChannel.id === channelId
    );
  }

  public getPronounsForMember(member: discord.Member): Pronoun {
    for (const roleId of member.roles) {
      const role = this.server.roles[roleId];
      if (!role) {
        continue;
      }

      const pronoun = getPronounFromRole(role);
      if (pronoun) {
        return pronoun;
      }
    }

    return DEFAULT_PRONOUNS;
  }

  private getChannel(channelId: string): discord.Channel {
    if (channelId && this.server.channels[channelId]) {
      return this.server.channels[channelId];
    }

    const systemChannelId: string = this.server.system_channel_id;
    if (this.server.channels[systemChannelId]) {
      return this.server.channels[systemChannelId];
    }

    return this.server.channels[0]; // If we don't have ANY channels, got a lot bigger problems.
  }

  private getOptionalString(str: string): string | null {
    if (!str || str.length === 0) {
      return null;
    }

    return str;
  }

  private async setFieldInDatabase(
    value: string,
    database: Database,
    dbColumn: string
  ): Promise<boolean> {
    try {
      const query =
        'UPDATE server_configs SET ' + dbColumn + ' = $1 WHERE server_id = $2';
      const result = await database.query(query, [value, this.serverId]);
      return result.rowCount !== 0;
    } catch (err) {
      this.error(err);
      return false;
    }
  }
}

export default ServerConfig;
