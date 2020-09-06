import CommandInvocation from '@phil/CommandInvocation';
import Features from '@phil/features/all-features';
import { HelpGroup } from '@phil/help-groups';
import MessageBuilder from '@phil/message-builder';
import Phil from '@phil/phil';
import {
  giveRoleToUser,
  sendMessageBuilder,
  getMemberRolesInServer,
} from '@phil/promises/discord';
import Requestable from '@phil/requestables';
import ServerConfig from '@phil/server-config';
import {
  sendSuccessMessage,
  getRandomArrayEntry,
  stitchTogetherArray,
} from '@phil/utils';
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
    invocation: CommandInvocation
  ): Promise<void> {
    if (invocation.commandArgs.length === 0) {
      return this.processNoCommandArgs(phil, invocation);
    }

    const requestable = await Requestable.getFromRequestString(
      phil.db,
      invocation.server,
      invocation.commandArgs[0]
    );
    if (!requestable) {
      throw new Error(
        'There is no requestable by the name of `' +
          invocation.commandArgs[0] +
          '`.'
      );
    }

    await this.ensureUserCanRequestRole(
      phil,
      invocation.serverConfig,
      invocation.userId,
      requestable
    );

    await giveRoleToUser(
      phil.bot,
      invocation.server.id,
      invocation.userId,
      requestable.role.id
    );
    await sendSuccessMessage({
      bot: phil.bot,
      channelId: invocation.channelId,
      message: `You have been granted the "${requestable.role.name}" role!`,
    });
  }

  private async ensureUserCanRequestRole(
    phil: Phil,
    serverConfig: ServerConfig,
    userId: string,
    requestable: Requestable
  ): Promise<void> {
    if (requestable.blacklistedUserIds.has(userId)) {
      throw new Error(
        `You are unable to request the "${requestable.role.name}" role at this time.`
      );
    }

    const memberRoles = await getMemberRolesInServer(
      phil.bot,
      serverConfig.serverId,
      userId
    );
    if (memberRoles.indexOf(requestable.role.id) >= 0) {
      throw new Error(
        `You already have the "${requestable.role.name}" role. You can use \`${serverConfig.commandPrefix}remove\` to remove the role if you wish.`
      );
    }
  }

  private async processNoCommandArgs(
    phil: Phil,
    invocation: CommandInvocation
  ): Promise<void> {
    const requestables = await Requestable.getAllRequestables(
      phil.db,
      invocation.server
    );
    if (requestables.length === 0) {
      throw new Error(
        'There are no requestable roles defined. An admin should use `' +
          invocation.serverConfig.commandPrefix +
          'define` to create some roles.'
      );
    }

    const reply = this.composeAllRequestablesList(
      invocation.serverConfig,
      requestables
    );
    await sendMessageBuilder(phil.bot, invocation.channelId, reply);
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

    const randomRequestable = getRandomArrayEntry(requestables);
    const randomRequestableString = getRandomArrayEntry(
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
    entry += stitchTogetherArray(requestable.requestStrings);
    entry += ' to receive the "' + requestable.role.name + '" role\n';
    return entry;
  }
}
