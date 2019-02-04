import FeatureUtils from '../../features/feature-utils';
import { HelpGroup } from '../../help-groups';
import MessageBuilder from '../../message-builder';
import PublicMessage from '../../messages/public';
import Phil from '../../phil';
import { DiscordPromises } from '../../promises/discord';
import Command, { CommandLookup, LoggerDefinition } from '../@types';
import CommandHelpInfo from './command-help-info';
import HelpGroupInfo from './help-group-info';

function isVisibleCommand(commandName: string, command: Command): boolean {
  if (command.aliases.indexOf(commandName) >= 0) {
    return false;
  }

  if (command.helpGroup === HelpGroup.None) {
    return false;
  }

  return true;
}

function getAllCommandHelpInfo(
  commands: CommandLookup,
  helpCommand: HelpCommand
): ReadonlyArray<CommandHelpInfo> {
  const commandInfo: CommandHelpInfo[] = [];
  for (const commandName in commands) {
    if (!commands.hasOwnProperty(commandName)) {
      continue;
    }

    const command = commands[commandName];
    if (!command) {
      continue;
    }

    if (!isVisibleCommand(commandName, command)) {
      continue;
    }

    const helpInfo = new CommandHelpInfo(command);
    commandInfo.push(helpInfo);
  }

  if (isVisibleCommand(helpCommand.name, helpCommand)) {
    const helpInfo = new CommandHelpInfo(helpCommand);
    commandInfo.push(helpInfo);
  }

  return commandInfo;
}

function groupCommands(
  commandInfo: ReadonlyArray<CommandHelpInfo>
): ReadonlyArray<HelpGroupInfo> {
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
  return helpGroups;
}

export default class HelpCommand extends Command {
  private readonly helpGroups: ReadonlyArray<HelpGroupInfo>;

  public constructor(
    parentDefinition: LoggerDefinition,
    lookup: CommandLookup
  ) {
    super('help', parentDefinition, {
      helpDescription:
        'Find out about all of the commands that Phil has available.',
      versionAdded: 3,
    });

    const allHelpInfo = getAllCommandHelpInfo(lookup, this);
    this.helpGroups = groupCommands(allHelpInfo);
  }

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
}
