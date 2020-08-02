import * as Discord from 'discord.io';
import Features from '@phil/features/all-features';
import { HelpGroup } from '@phil/help-groups';
import MessageBuilder from '@phil/message-builder';
import PublicMessage from '@phil/messages/public';
import Phil from '@phil/phil';
import {
  takeRoleFromUser,
  sendMessageBuilder,
  getMemberRolesInServer,
} from '@phil/promises/discord';
import Requestable from '@phil/requestables';
import ServerConfig from '@phil/server-config';
import {
  getRandomArrayEntry,
  sendSuccessMessage,
  stitchTogetherArray,
} from '@phil/utils';
import Command, { LoggerDefinition } from './@types';

export default class RemoveCommand extends Command {
  public constructor(parentDefinition: LoggerDefinition) {
    super('remove', parentDefinition, {
      feature: Features.Requestables,
      helpDescription:
        'Asks Phil to take away a requestable role that he has given you.',
      helpGroup: HelpGroup.Roles,
      versionAdded: 7,
    });
  }

  public async processMessage(
    phil: Phil,
    message: PublicMessage,
    commandArgs: ReadonlyArray<string>
  ): Promise<void> {
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

    await this.ensureUserHasRole(
      phil,
      message.server,
      message.userId,
      requestable
    );

    await takeRoleFromUser(
      phil.bot,
      message.server.id,
      message.userId,
      requestable.role.id
    );
    await sendSuccessMessage({
      bot: phil.bot,
      channelId: message.channelId,
      message:
        'I\'ve removed the "' + requestable.role.name + '" role from you.',
    });
  }

  private async ensureUserHasRole(
    phil: Phil,
    server: Discord.Server,
    userId: string,
    requestable: Requestable
  ): Promise<Discord.Role> {
    const memberRoles = await getMemberRolesInServer(
      phil.bot,
      server.id,
      userId
    );
    if (memberRoles.indexOf(requestable.role.id) < 0) {
      throw new Error(
        'I haven\'t given you the "' + requestable.role.name + '" role.'
      );
    }

    return requestable.role;
  }

  private async processNoCommandArgs(
    phil: Phil,
    message: PublicMessage
  ): Promise<void> {
    const userRequestables = await this.getAllRequestablesUserHas(
      phil,
      message.serverConfig,
      message.userId
    );
    if (userRequestables.length === 0) {
      throw new Error(
        "I haven't given you any requestable roles yet. You use `" +
          message.serverConfig.commandPrefix +
          'request` in order to obtain these roles.'
      );
    }

    const reply = this.composeAllRequestablesList(
      message.serverConfig,
      userRequestables
    );
    await sendMessageBuilder(phil.bot, message.channelId, reply);
  }

  private async getAllRequestablesUserHas(
    phil: Phil,
    serverConfig: ServerConfig,
    userId: string
  ): Promise<Requestable[]> {
    const requestables = await Requestable.getAllRequestables(
      phil.db,
      serverConfig.server
    );
    if (requestables.length === 0) {
      throw new Error(
        'There are no requestable roles defined. An admin should use `' +
          serverConfig.commandPrefix +
          'define` to create some roles.'
      );
    }

    const memberRoles = await getMemberRolesInServer(
      phil.bot,
      serverConfig.serverId,
      userId
    );
    const requestablesUserHas = [];
    for (const requestable of requestables) {
      if (memberRoles.indexOf(requestable.role.id) >= 0) {
        requestablesUserHas.push(requestable);
      }
    }

    return requestablesUserHas;
  }

  private composeAllRequestablesList(
    serverConfig: ServerConfig,
    requestables: Requestable[]
  ): MessageBuilder {
    const builder = new MessageBuilder();
    builder.append(
      ':snowflake: These are the roles you can remove using `' +
        serverConfig.commandPrefix +
        'remove`:\n'
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
        'remove ' +
        randomRequestableString +
        '`.'
    );
    return builder;
  }

  private composeRequestableListEntry(requestable: Requestable): string {
    let entry = '- ';
    entry += stitchTogetherArray(requestable.requestStrings);
    entry += ' to remove the "' + requestable.role.name + '" role\n';
    return entry;
  }
}
