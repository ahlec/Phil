import { BatchFeaturesEnabledLookup } from '@phil/features/feature-utils';
import { getHeaderForGroup, HelpGroup } from '@phil/help-groups';
import MessageBuilder from '@phil/message-builder';
import CommandHelpInfo from './command-help-info';

class HelpGroupInfo {
  public static sort(a: HelpGroupInfo, b: HelpGroupInfo): number {
    return a.helpGroup - b.helpGroup;
  }

  private readonly commands: CommandHelpInfo[] = [];
  private readonly header: string;

  constructor(public helpGroup: HelpGroup) {
    this.header = '\n\n**' + getHeaderForGroup(helpGroup) + '**\n';
  }

  public addCommandInfo(commandInfo: CommandHelpInfo): void {
    this.commands.push(commandInfo);
  }

  public finish(): void {
    this.commands.sort(CommandHelpInfo.sort);
  }

  public shouldDisplay(
    isAdminChannel: boolean,
    featuresEnabledLookup: BatchFeaturesEnabledLookup
  ): boolean {
    for (const command of this.commands) {
      if (command.shouldDisplay(isAdminChannel, featuresEnabledLookup)) {
        return true;
      }
    }

    return false;
  }

  public append(
    builder: MessageBuilder,
    isAdminChannel: boolean,
    featuresEnabledLookup: BatchFeaturesEnabledLookup
  ): void {
    builder.append(this.header);

    for (const command of this.commands) {
      if (!command.shouldDisplay(isAdminChannel, featuresEnabledLookup)) {
        continue;
      }

      builder.append(command.message + '\n');
    }
  }
}

export default HelpGroupInfo;
