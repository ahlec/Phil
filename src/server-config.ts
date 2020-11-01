import Role from '@phil/discord/Role';
import Server from '@phil/discord/Server';
import ServerPermissions from '@phil/discord/ServerPermissions';
import TextChannel from '@phil/discord/TextChannel';

import Database from './database';
import Logger from './Logger';
import LoggerDefinition from './LoggerDefinition';
import { DEFAULT_PRONOUNS } from './pronouns/definitions';
import Pronoun from './pronouns/pronoun';
import { getPronounFromRole } from './pronouns/utils';
import { getRandomArrayEntry, isNotNull } from './utils';

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
    server: Server
  ): Promise<ServerConfig | null> {
    const results = await db.query<DbRow>(
      'SELECT * FROM server_configs WHERE server_id = $1',
      [server.id]
    );
    if (results.rowCount === 0) {
      return null;
    }

    return new ServerConfig(db, server, results.rows[0]);
  }

  public static async initializeDefault(
    db: Database,
    server: Server
  ): Promise<ServerConfig> {
    let botControlChannel = server.getTextChannel(server.id);
    if (!botControlChannel) {
      botControlChannel = server.textChannels[0];
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

    return new ServerConfig(db, server, creation.rows[0]);
  }

  public readonly serverId: string;
  public readonly fandomMapLink: string | null;
  private commandPrefixInternal: string;
  private botControlChannelId: string;
  private adminChannelId: string;
  private introductionsChannelId: string;
  private newsChannelId: string;
  private adminRoleId: string | null;
  private welcomeMessageInternal: string | null;

  private constructor(
    private readonly database: Database,
    private readonly server: Server,
    dbRow: DbRow
  ) {
    super(new LoggerDefinition('Server Config'));

    this.serverId = dbRow.server_id;
    this.commandPrefixInternal = dbRow.command_prefix;
    this.botControlChannelId = dbRow.bot_control_channel_id;
    this.adminChannelId = dbRow.admin_channel_id;
    this.introductionsChannelId = dbRow.introductions_channel_id;
    this.newsChannelId = dbRow.news_channel_id;
    this.welcomeMessageInternal = this.getOptionalString(dbRow.welcome_message);
    this.fandomMapLink = this.getOptionalString(dbRow.fandom_map_link);

    if (dbRow.admin_role_id) {
      this.adminRoleId = dbRow.admin_role_id;
    }
  }

  // -----------------------------------------------------------------------------
  // Accessors and mutators
  // -----------------------------------------------------------------------------

  public get commandPrefix(): string {
    return this.commandPrefixInternal;
  }

  public async setCommandPrefix(prefix: string): Promise<boolean> {
    const result = await this.setFieldInDatabase(prefix, 'command_prefix');
    if (!result) {
      return false;
    }

    this.commandPrefixInternal = prefix;
    return true;
  }

  public get botControlChannel(): TextChannel {
    return this.getChannel(this.botControlChannelId);
  }

  public async setBotControlChannel(channelId: string): Promise<boolean> {
    const result = await this.setFieldInDatabase(
      channelId,
      'bot_control_channel_id'
    );
    if (!result) {
      return false;
    }

    this.botControlChannelId = channelId;
    return true;
  }

  public get adminChannel(): TextChannel {
    return this.getChannel(this.adminChannelId);
  }

  public async setAdminChannel(channelId: string): Promise<boolean> {
    const result = await this.setFieldInDatabase(channelId, 'admin_channel_id');
    if (!result) {
      return false;
    }

    this.adminChannelId = channelId;
    return true;
  }

  public get introductionsChannel(): TextChannel {
    return this.getChannel(this.introductionsChannelId);
  }

  public async setIntroductionsChannel(channelId: string): Promise<boolean> {
    const result = await this.setFieldInDatabase(
      channelId,
      'introductions_channel_id'
    );
    if (!result) {
      return false;
    }

    this.introductionsChannelId = channelId;
    return true;
  }

  public get newsChannel(): TextChannel {
    return this.getChannel(this.newsChannelId);
  }

  public async setNewsChannel(channelId: string): Promise<boolean> {
    const result = await this.setFieldInDatabase(channelId, 'news_channel_id');
    if (!result) {
      return false;
    }

    this.newsChannelId = channelId;
    return true;
  }

  public get adminRole(): Role | null {
    if (!this.adminRoleId) {
      return null;
    }

    return this.server.getRole(this.adminRoleId);
  }

  public async setAdminRole(roleId: string): Promise<boolean> {
    const result = await this.setFieldInDatabase(roleId, 'admin_role_id');
    if (!result) {
      return false;
    }

    this.adminRoleId = roleId;
    return true;
  }

  public get welcomeMessage(): string | null {
    return this.welcomeMessageInternal;
  }

  public async setWelcomeMessage(message: string): Promise<boolean> {
    const result = await this.setFieldInDatabase(message, 'welcome_message');
    if (!result) {
      return false;
    }

    this.welcomeMessageInternal = message;
    return true;
  }

  // -----------------------------------------------------------------------------
  // Utility functions
  // -----------------------------------------------------------------------------

  public async isAdmin(memberId: string): Promise<boolean> {
    const member = await this.server.getMember(memberId);
    if (!member) {
      return false;
    }

    const hasAdminRole = member.roles.some((role: Role): boolean => {
      if (this.adminRoleId === role.id) {
        return true;
      }

      return role.hasPermission(ServerPermissions.GeneralAdministrator);
    });
    if (hasAdminRole) {
      return true;
    }

    // Check @everyone role
    if (
      this.server.everyoneRole.hasPermission(
        ServerPermissions.GeneralAdministrator
      )
    ) {
      return true;
    }

    // The owner of the server is also an admin
    const owner = await this.server.getOwner();
    return owner.user.id === memberId;
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

  public async getPronounsForMember(memberId: string): Promise<Pronoun> {
    const member = await this.server.getMember(memberId);
    if (!member) {
      return DEFAULT_PRONOUNS;
    }

    const uniquePronouns = member.roles
      .map((role): Pronoun | null => getPronounFromRole(role))
      .filter(isNotNull);

    if (uniquePronouns.length === 1) {
      return uniquePronouns[0];
    }

    return getRandomArrayEntry(uniquePronouns);
  }

  private getChannel(channelId: string): TextChannel {
    if (channelId) {
      const channel = this.server.getTextChannel(channelId);
      if (channel) {
        return channel;
      }
    }

    return this.server.systemChannel || this.server.textChannels[0]; // If we don't have ANY channels, got a lot bigger problems.
  }

  private getOptionalString(str: string): string | null {
    if (!str || str.length === 0) {
      return null;
    }

    return str;
  }

  private async setFieldInDatabase(
    value: string,
    dbColumn: string
  ): Promise<boolean> {
    try {
      const query =
        'UPDATE server_configs SET ' + dbColumn + ' = $1 WHERE server_id = $2';
      const result = await this.database.query(query, [value, this.serverId]);
      return result.rowCount !== 0;
    } catch (err) {
      this.error(err);
      return false;
    }
  }
}

export default ServerConfig;
