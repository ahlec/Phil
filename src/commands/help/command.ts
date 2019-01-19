import Feature from '../../features/feature';
import FeatureUtils from '../../features/feature-utils';
import { HelpGroup } from '../../help-groups';
import MessageBuilder from '../../message-builder';
import PublicMessage from '../../messages/public';
import PermissionLevel from '../../permission-level';
import Phil from '../../phil';
import { DiscordPromises } from '../../promises/discord';
import ICommand, { ICommandLookup } from '../@types';
import CommandHelpInfo from './command-help-info';
import HelpGroupInfo from './help-group-info';

function isVisibleCommand(commandName: string, command: ICommand): boolean {
  if (command.aliases.indexOf(commandName) >= 0) {
    return false;
  }

  if (command.helpGroup === HelpGroup.None) {
    return false;
  }

  return true;
}

export default class HelpCommand implements ICommand {
  public readonly name = 'help';
  public readonly aliases: ReadonlyArray<string> = [];
  public readonly feature: Feature = null;
  public readonly permissionLevel = PermissionLevel.General;

  public readonly helpGroup = HelpGroup.General;
  public readonly helpDescription =
    'Find out about all of the commands that Phil has available.';

  public readonly versionAdded = 3;

  private helpGroups: ReadonlyArray<HelpGroupInfo> = [];

  public async processMessage(
    phil: Phil,
    message: PublicMessage,
    commandArgs: ReadonlyArray<string>
  ): Promise<any> {
    const isAdminChannel = message.serverConfig.isAdminChannel(
      message.channelId
    );
    const featuresEnabledLookup = await FeatureUtils.getServerFeaturesStatus(
      phil.db,
      message.server.id
    );
    const builder = new MessageBuilder();

    for (const helpGroup of this.helpGroups) {
      if (!helpGroup.shouldDisplay(isAdminChannel, featuresEnabledLookup)) {
        continue;
      }

      helpGroup.append(builder, isAdminChannel, featuresEnabledLookup);
    }

    for (const helpMessage of builder.messages) {
      await DiscordPromises.sendMessage(
        phil.bot,
        message.channelId,
        helpMessage
      );
    }
  }

  public saveCommandDefinitions(commands: ICommandLookup) {
    const commandInfo = this.getAllCommandHelpInfo(commands);
    const groupLookup: { [groupNum: number]: HelpGroupInfo } = {};

    for (const info of commandInfo) {
      if (!groupLookup[info.helpGroup]) {
        groupLookup[info.helpGroup] = new HelpGroupInfo(info.helpGroup);
      }

      groupLookup[info.helpGroup].addCommandInfo(info);
    }

    const helpGroups: HelpGroupInfo[] = [];
    for (const groupNum in groupLookup) {
      if (!groupLookup.hasOwnProperty(groupNum)) {
        continue;
      }

      const group = groupLookup[groupNum];
      group.finish();
      helpGroups.push(group);
    }

    helpGroups.sort(HelpGroupInfo.sort);
    this.helpGroups = helpGroups;
  }

  private getAllCommandHelpInfo(commands: ICommandLookup): CommandHelpInfo[] {
    const commandInfo: CommandHelpInfo[] = [];
    for (const commandName in commands) {
      if (!commands.hasOwnProperty(commandName)) {
        continue;
      }

      const command = commands[commandName];
      if (!isVisibleCommand(commandName, command)) {
        continue;
      }

      const helpInfo = new CommandHelpInfo(command);
      commandInfo.push(helpInfo);
    }

    return commandInfo;
  }
}
