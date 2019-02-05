import { BatchFeaturesEnabledLookup } from '../../features/feature-utils';
import { getHeaderForGroup, HelpGroup } from '../../help-groups';
import MessageBuilder from '../../message-builder';
import CommandHelpInfo from './command-help-info';

export default class HelpGroupInfo {
  public static sort(a: HelpGroupInfo, b: HelpGroupInfo): number {
    return a.helpGroup - b.helpGroup;
  }

  private readonly commands: CommandHelpInfo[] = [];
  private readonly header: string;

  constructor(public helpGroup: HelpGroup) {
    this.header = '\n\n**' + getHeaderForGroup(helpGroup) + '**\n';
  }

  public addCommandInfo(commandInfo: CommandHelpInfo) {
    this.commands.push(commandInfo);
  }

  public finish() {
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
  ) {
    builder.append(this.header);

    for (const command of this.commands) {
      if (!command.shouldDisplay(isAdminChannel, featuresEnabledLookup)) {
        continue;
      }

      builder.append(command.message + '\n');
    }
  }
}
