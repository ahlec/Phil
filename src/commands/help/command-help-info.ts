import Feature from '../../features/feature';
import { IBatchFeaturesEnabledLookup } from '../../features/feature-utils';
import { HelpGroup } from '../../help-groups';
import PermissionLevel from '../../permission-level';
import Versions from '../../versions';
import ICommand from '../@types';

export default class CommandHelpInfo {
  public static sort(a: CommandHelpInfo, b: CommandHelpInfo): number {
    if (a.name === b.name) {
      return 0;
    }

    if (a.permissionLevel !== b.permissionLevel) {
      return a.permissionLevel - b.permissionLevel;
    }

    return a.name < b.name ? -1 : 1;
  }

  private static isVersionNew(version: number): boolean {
    return version >= Versions.CODE - 1;
  }

  public readonly name: string;
  public readonly helpGroup: HelpGroup;
  public readonly permissionLevel: PermissionLevel;
  public readonly message: string;
  private readonly isNew: boolean;
  private readonly aliases: ReadonlyArray<string>;
  private readonly helpDescription: string | null;
  private readonly feature: Feature | null;

  constructor(command: ICommand) {
    this.name = command.name;
    this.helpGroup = command.helpGroup;
    this.permissionLevel = command.permissionLevel;
    this.helpDescription = command.helpDescription;
    this.isNew = CommandHelpInfo.isVersionNew(command.versionAdded);
    this.aliases = command.aliases;
    this.feature = command.feature;

    this.message = this.createHelpMessage();
  }

  public shouldDisplay(
    isAdminChannel: boolean,
    featuresEnabledLookup: IBatchFeaturesEnabledLookup
  ): boolean {
    if (this.permissionLevel === PermissionLevel.BotManagerOnly) {
      return false;
    }

    if (!isAdminChannel && this.permissionLevel === PermissionLevel.AdminOnly) {
      return false;
    }

    if (this.feature && !featuresEnabledLookup[this.feature.id]) {
      return false;
    }

    return true;
  }

  private createHelpMessage(): string {
    let message =
      this.permissionLevel === PermissionLevel.AdminOnly
        ? ':small_orange_diamond:'
        : ':small_blue_diamond:';

    if (this.isNew) {
      message += ':new:';
    }

    message += ' [`' + this.name + '`';
    if (this.aliases.length > 0) {
      message += ' (alias';
      if (this.aliases.length > 1) {
        message += 'es';
      }

      message += ': ';
      for (let index = 0; index < this.aliases.length; ++index) {
        if (index > 0) {
          message += ', ';
        }

        message += '`' + this.aliases[index] + '`';
      }

      message += ')';
    }

    message += '] ' + this.helpDescription;
    return message;
  }
}
