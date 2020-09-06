import * as Discord from 'discord.io';
import CommandInvocation from '@phil/CommandInvocation';

import Features from '@phil/features/all-features';
import { HelpGroup } from '@phil/help-groups';
import MessageBuilder from '@phil/message-builder';
import Phil from '@phil/phil';
import {
  takeRoleFromUser,
  getMemberRolesInServer,
} from '@phil/promises/discord';
import Requestable from '@phil/requestables';
import ServerConfig from '@phil/server-config';
import { getRandomArrayEntry, stitchTogetherArray } from '@phil/utils';
import Command, { LoggerDefinition } from './@types';
import Database from '@phil/database';

class RemoveCommand extends Command {
  public constructor(parentDefinition: LoggerDefinition) {
    super('remove', parentDefinition, {
      feature: Features.Requestables,
      helpDescription:
        'Asks Phil to take away a requestable role that he has given you.',
      helpGroup: HelpGroup.Roles,
      versionAdded: 7,
    });
  }

  public async invoke(
    invocation: CommandInvocation,
    database: Database,
    legacyPhil: Phil
  ): Promise<void> {
    if (invocation.commandArgs.length === 0) {
      return this.processNoCommandArgs(legacyPhil, database, invocation);
    }

    const requestable = await Requestable.getFromRequestString(
      database,
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

    await this.ensureUserHasRole(
      legacyPhil,
      invocation.server,
      invocation.userId,
      requestable
    );

    await takeRoleFromUser(
      legacyPhil.bot,
      invocation.server.id,
      invocation.userId,
      requestable.role.id
    );
    await invocation.respond({
      text: 'I\'ve removed the "' + requestable.role.name + '" role from you.',
      type: 'success',
    });
  }

  private async ensureUserHasRole(
    legacyPhil: Phil,
    server: Discord.Server,
    userId: string,
    requestable: Requestable
  ): Promise<Discord.Role> {
    const memberRoles = await getMemberRolesInServer(
      legacyPhil.bot,
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
    legacyPhil: Phil,
    database: Database,
    invocation: CommandInvocation
  ): Promise<void> {
    const userRequestables = await this.getAllRequestablesUserHas(
      legacyPhil,
      database,
      invocation.context.serverConfig,
      invocation.userId
    );
    if (userRequestables.length === 0) {
      throw new Error(
        "I haven't given you any requestable roles yet. You use `" +
          invocation.context.serverConfig.commandPrefix +
          'request` in order to obtain these roles.'
      );
    }

    const reply = this.composeAllRequestablesList(
      invocation.context.serverConfig,
      userRequestables
    );
    await invocation.respond({
      text: reply,
      type: 'plain',
    });
  }

  private async getAllRequestablesUserHas(
    legacyPhil: Phil,
    database: Database,
    serverConfig: ServerConfig,
    userId: string
  ): Promise<Requestable[]> {
    const requestables = await Requestable.getAllRequestables(
      database,
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
      legacyPhil.bot,
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

export default RemoveCommand;
