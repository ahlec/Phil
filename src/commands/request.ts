import CommandInvocation from '@phil/CommandInvocation';
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

  public async invoke(invocation: CommandInvocation): Promise<void> {
    if (invocation.commandArgs.length === 0) {
      return this.processNoCommandArgs(invocation);
    }

    const requestable = await invocation.context.requestables.retrieve({
      requestString: invocation.commandArgs[0],
      type: 'request-string',
    });
    if (!requestable) {
      await invocation.respond({
        error: `There is no requestable by the name of \`${invocation.commandArgs[0]}\`.`,
        type: 'error',
      });
      return;
    }

    const member = await invocation.context.server.getMember(invocation.userId);
    if (!member) {
      return;
    }

    const requestability = await requestable.determineRequestability(member);
    if (!requestability.allowed) {
      switch (requestability.reason) {
        case 'on-blacklist': {
          await invocation.respond({
            error: `You are unable to request the "${requestable.role.name}" role at this time.`,
            type: 'error',
          });
          return;
        }
        case 'already-have-role': {
          await invocation.respond({
            error: `You already have the "${requestable.role.name}" role. You can use \`${invocation.context.serverConfig.commandPrefix}remove\` to remove the role if you wish.`,
            type: 'error',
          });
          return;
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
    invocation: CommandInvocation
  ): Promise<void> {
    const requestables = await invocation.context.requestables.getAll();
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
    requestables: readonly Requestable[]
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
