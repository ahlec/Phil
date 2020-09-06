import Feature from '@phil/features/feature';
import { BatchFeaturesEnabledLookup } from '@phil/features/feature-utils';
import { HelpGroup } from '@phil/help-groups';
import PermissionLevel from '@phil/permission-level';
import { CODE_VERSION } from '@phil/versions';
import ICommand from '@phil/commands/@types';

class CommandHelpInfo {
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
    return version >= CODE_VERSION.majorVersion - 1;
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
    featuresEnabledLookup: BatchFeaturesEnabledLookup
  ): boolean {
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

export default CommandHelpInfo;
