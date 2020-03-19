import Feature from '@phil/features/feature';
import { HelpGroup } from '@phil/help-groups';
import Logger from '@phil/Logger';
import LoggerDefinition from '@phil/LoggerDefinition';
import PublicMessage from '@phil/discord/PublicMessage';
import PermissionLevel from '@phil/permission-level';
import Database from '@phil/database';
import DiscordClient from '@phil/discord/Client';

export type CommandDetails = {
  aliases?: ReadonlyArray<string>;
  feature?: Feature;
  permissionLevel?: PermissionLevel;
  versionAdded: number;
} & (
  | { helpGroup: HelpGroup.None }
  | { helpGroup?: HelpGroup; helpDescription: string });

export default abstract class Command extends Logger {
  public readonly aliases: ReadonlyArray<string>;
  public readonly feature: Feature | null;
  public readonly permissionLevel: PermissionLevel;
  public readonly helpGroup: HelpGroup;
  public readonly helpDescription: string | null = null;
  public readonly versionAdded: number;

  protected constructor(
    public readonly name: string,
    parentDefinition: LoggerDefinition,
    properties: CommandDetails
  ) {
    super(new LoggerDefinition(name, parentDefinition));

    this.aliases = properties.aliases || [];
    this.feature = properties.feature || null;
    this.permissionLevel =
      properties.permissionLevel || PermissionLevel.General;
    this.versionAdded = properties.versionAdded;
    this.helpGroup = properties.helpGroup || HelpGroup.General;
    if (properties.helpGroup !== HelpGroup.None) {
      this.helpDescription = properties.helpDescription;
    }
  }

  public abstract processMessage(
    discordClient: DiscordClient,
    database: Database,
    message: PublicMessage,
    commandArgs: ReadonlyArray<string>
  ): Promise<void>;
}

export interface CommandLookup {
  [handle: string]: Command;
}

export { default as LoggerDefinition } from '@phil/LoggerDefinition';
