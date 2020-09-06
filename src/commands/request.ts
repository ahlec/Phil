import CommandInvocation from '@phil/CommandInvocation';
import Database from '@phil/database';
import Features from '@phil/features/all-features';
import { HelpGroup } from '@phil/help-groups';
import MessageBuilder from '@phil/message-builder';
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
    database: Database
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
      return invocation.respond({
        error: `There is no requestable by the name of \`${invocation.commandArgs[0]}\`.`,
        type: 'error',
      });
    }

    const member = await invocation.context.server.getMember(invocation.userId);
    if (!member) {
      return;
    }

    const requestability = await requestable.determineRequestability(member);
    if (!requestability.allowed) {
      switch (requestability.reason) {
        case 'on-blacklist': {
          return invocation.respond({
            error: `You are unable to request the "${requestable.role.name}" role at this time.`,
            type: 'error',
          });
        }
        case 'already-have-role': {
          return invocation.respond({
            error: `You already have the "${requestable.role.name}" role. You can use \`${invocation.context.serverConfig.commandPrefix}remove\` to remove the role if you wish.`,
            type: 'error',
          });
        }
        default: {
          // This doesn't produce an error if we've handled every value in the union.
          // If this produces an error, don't remove the line -- handle the missing value!
          return requestability.reason;
        }
      }
    }

    await member.giveRole(requestable.role);

    await invocation.respond({
      text: `You have been granted the "${requestable.role.name}" role!`,
      type: 'success',
    });
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
