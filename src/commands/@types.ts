import Feature from '../features/feature';
import { HelpGroup } from '../help-groups';
import Logger from '../Logger';
import LoggerDefinition from '../LoggerDefinition';
import PublicMessage from '../messages/public';
import PermissionLevel from '../permission-level';
import Phil from '../phil';

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
    properties: {
      aliases?: ReadonlyArray<string>;
      feature?: Feature;
      permissionLevel?: PermissionLevel;
      versionAdded: number;
    } & (
      | { helpGroup: HelpGroup.None }
      | { helpGroup?: HelpGroup; helpDescription: string })
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
    phil: Phil,
    message: PublicMessage,
    commandArgs: ReadonlyArray<string>
  ): Promise<any>;
}

export interface CommandLookup {
  [handle: string]: Command | undefined;
}

export { default as Logger } from '../Logger';
export { default as LoggerDefinition } from '../LoggerDefinition';
