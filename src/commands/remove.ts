import * as Discord from 'discord.io';
import Database from '../database';
import Features from '../features/all-features';
import { HelpGroup } from '../help-groups';
import MessageBuilder from '../message-builder';
import PublicMessage from '../messages/public';
import Phil from '../phil';
import { takeRoleFromUser, sendMessageBuilder } from '../promises/discord';
import Requestable from '../requestables';
import ServerConfig from '../server-config';
import {
  getRandomArrayEntry,
  sendSuccessMessage,
  stitchTogetherArray,
} from '../utils';
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

    this.ensureUserHasRole(message.server, message.userId, requestable);

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

  private ensureUserHasRole(
    server: Discord.Server,
    userId: string,
    requestable: Requestable
  ): Discord.Role {
    const member = server.members[userId];

    if (member.roles.indexOf(requestable.role.id) < 0) {
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
      phil.db,
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
    db: Database,
    serverConfig: ServerConfig,
    userId: string
  ): Promise<Requestable[]> {
    const requestables = await Requestable.getAllRequestables(
      db,
      serverConfig.server
    );
    if (requestables.length === 0) {
      throw new Error(
        'There are no requestable roles defined. An admin should use `' +
          serverConfig.commandPrefix +
          'define` to create some roles.'
      );
    }

    const member = serverConfig.server.members[userId];
    const requestablesUserHas = [];
    for (const requestable of requestables) {
      if (member.roles.indexOf(requestable.role.id) >= 0) {
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
