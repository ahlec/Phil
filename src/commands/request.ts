import CommandInvocation from '@phil/CommandInvocation';
import Database from '@phil/database';
import Features from '@phil/features/all-features';
import { HelpGroup } from '@phil/help-groups';
import MessageBuilder from '@phil/message-builder';
import Phil from '@phil/phil';
import { getMemberRolesInServer } from '@phil/promises/discord';
import Requestable from '@phil/requestables';
import ServerConfig from '@phil/server-config';
import { getRandomArrayEntry, stitchTogetherArray } from '@phil/utils';
import Command, { LoggerDefinition } from './@types';

class RequestCommand extends Command {
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

  public async invoke(
    invocation: CommandInvocation,
    database: Database,
    legacyPhil: Phil
  ): Promise<void> {
    if (invocation.commandArgs.length === 0) {
      return this.processNoCommandArgs(invocation, database);
    }

    const requestable = await Requestable.getFromRequestString(
      invocation.context.server,
      database,
      invocation.commandArgs[0]
    );
    if (!requestable) {
      throw new Error(
        'There is no requestable by the name of `' +
          invocation.commandArgs[0] +
          '`.'
      );
    }

    const member = await invocation.context.server.getMember(invocation.userId);
    if (!member) {
      return;
    }

    await this.ensureUserCanRequestRole(
      legacyPhil,
      invocation.context.serverConfig,
      invocation.userId,
      requestable
    );

    await member.giveRole(requestable.role);

    await invocation.respond({
      text: `You have been granted the "${requestable.role.name}" role!`,
      type: 'success',
    });
  }

  private async ensureUserCanRequestRole(
    legacyPhil: Phil,
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
      legacyPhil.bot,
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
    invocation: CommandInvocation,
    database: Database
  ): Promise<void> {
    const requestables = await Requestable.getAllRequestables(
      invocation.context.server,
      database
    );
    if (requestables.length === 0) {
      throw new Error(
        'There are no requestable roles defined. An admin should use `' +
          invocation.context.serverConfig.commandPrefix +
          'define` to create some roles.'
      );
    }

    const reply = this.composeAllRequestablesList(
      invocation.context.serverConfig,
      requestables
    );
    await invocation.respond({
      text: reply,
      type: 'plain',
    });
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

export default RequestCommand;
