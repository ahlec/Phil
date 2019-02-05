import Features from '../features/all-features';
import { HelpGroup } from '../help-groups';
import MessageBuilder from '../message-builder';
import PublicMessage from '../messages/public';
import Phil from '../phil';
import { DiscordPromises } from '../promises/discord';
import Requestable from '../requestables';
import ServerConfig from '../server-config';
import BotUtils from '../utils';
import Command, { LoggerDefinition } from './@types';

export default class RequestCommand extends Command {
  public constructor(parentDefinition: LoggerDefinition) {
    super('request', parentDefinition, {
      aliases: ['giveme'],
      feature: Features.Requestables,
      helpDescription:
        'Asks Phil to give you a role. Using the command by itself will show you all of the roles he can give you.',
      helpGroup: HelpGroup.Roles,
      versionAdded: 1,
    });
  }

  public async processMessage(
    phil: Phil,
    message: PublicMessage,
    commandArgs: ReadonlyArray<string>
  ): Promise<any> {
    if (commandArgs.length === 0) {
      return this.processNoCommandArgs(phil, message);
    }

    const requestable = await Requestable.getFromRequestString(
      phil.db,
      message.server,
      commandArgs[0]
    );
    if (!requestable) {
      throw new Error(
        'There is no requestable by the name of `' + commandArgs[0] + '`.'
      );
    }

    this.ensureUserCanRequestRole(
      message.serverConfig,
      message.userId,
      requestable
    );

    await DiscordPromises.giveRoleToUser(
      phil.bot,
      message.server.id,
      message.userId,
      requestable.role.id
    );
    BotUtils.sendSuccessMessage({
      bot: phil.bot,
      channelId: message.channelId,
      message:
        'You have been granted the "' + requestable.role.name + '" role!',
    });
  }

  private ensureUserCanRequestRole(
    serverConfig: ServerConfig,
    userId: string,
    requestable: Requestable
  ) {
    const member = serverConfig.server.members[userId];
    if (member.roles.indexOf(requestable.role.id) >= 0) {
      throw new Error(
        'You already have the "' +
          requestable.role.name +
          '" role. You can use `' +
          serverConfig.commandPrefix +
          'remove` to remove the role if you wish.'
      );
    }
  }

  private async processNoCommandArgs(
    phil: Phil,
    message: PublicMessage
  ): Promise<any> {
    const requestables = await Requestable.getAllRequestables(
      phil.db,
      message.server
    );
    if (requestables.length === 0) {
      throw new Error(
        'There are no requestable roles defined. An admin should use `' +
          message.serverConfig.commandPrefix +
          'define` to create some roles.'
      );
    }

    const reply = this.composeAllRequestablesList(
      message.serverConfig,
      requestables
    );
    return DiscordPromises.sendMessageBuilder(
      phil.bot,
      message.channelId,
      reply
    );
  }

  private composeAllRequestablesList(
    serverConfig: ServerConfig,
    requestables: Requestable[]
  ): MessageBuilder {
    const builder = new MessageBuilder();
    builder.append(
      ':snowflake: You must provide a valid requestable name of a role when using `' +
        serverConfig.commandPrefix +
        'request`. These are currently:\n'
    );

    for (const requestable of requestables) {
      builder.append(this.composeRequestableListEntry(requestable));
    }

    const randomRequestable = BotUtils.getRandomArrayEntry(requestables);
    const randomRequestableString = BotUtils.getRandomArrayEntry(
      randomRequestable.requestStrings
    );

    builder.append(
      '\nJust use one of the above requestable names, like `' +
        serverConfig.commandPrefix +
        'request ' +
        randomRequestableString +
        '`.'
    );
    return builder;
  }

  private composeRequestableListEntry(requestable: Requestable): string {
    let entry = '- ';
    entry += BotUtils.stitchTogetherArray(requestable.requestStrings);
    entry += ' to receive the "' + requestable.role.name + '" role\n';
    return entry;
  }
}
