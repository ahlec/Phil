import CommandInvocation from '@phil/CommandInvocation';
import Database from '@phil/database';
import { getServerFeaturesStatus } from '@phil/features/feature-utils';
import { HelpGroup } from '@phil/help-groups';
import MessageBuilder from '@phil/message-builder';
import Command, {
  CommandLookup,
  LoggerDefinition,
} from '@phil/commands/@types';
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
    const group = groupLookup[groupNum];
    group.finish();
    helpGroups.push(group);
  }

  helpGroups.sort(HelpGroupInfo.sort);
  return helpGroups;
}

class HelpCommand extends Command {
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

  public async invoke(
    invocation: CommandInvocation,
    database: Database
  ): Promise<void> {
    const isAdminChannel = invocation.context.serverConfig.isAdminChannel(
      invocation.context.channelId
    );
    const featuresEnabledLookup = await getServerFeaturesStatus(
      database,
      invocation.server.id
    );
    const builder = new MessageBuilder();

    for (const helpGroup of this.helpGroups) {
      if (!helpGroup.shouldDisplay(isAdminChannel, featuresEnabledLookup)) {
        continue;
      }

      helpGroup.append(builder, isAdminChannel, featuresEnabledLookup);
    }

    for (const helpMessage of builder.messages) {
      await invocation.respond({
        text: helpMessage,
        type: 'plain',
      });
    }
  }
}

export default HelpCommand;
