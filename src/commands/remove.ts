import Member from '@phil/discord/Member';

import CommandInvocation from '@phil/CommandInvocation';
import Features from '@phil/features/all-features';
import { HelpGroup } from '@phil/help-groups';
import MessageBuilder from '@phil/message-builder';
import Requestable from '@phil/requestables';
import ServerConfig from '@phil/server-config';
import { getRandomArrayEntry, stitchTogetherArray } from '@phil/utils';
import Command, { LoggerDefinition } from './@types';

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

  public async invoke(invocation: CommandInvocation): Promise<void> {
    const member = await invocation.context.server.getMember(invocation.userId);
    if (!member) {
      await invocation.respond({
        error:
          "I don't seem to know about you yet. Would you make sure an admin sees this so we can get you sorted out?",
        type: 'error',
      });
      return;
    }

    if (invocation.commandArgs.length === 0) {
      return this.processNoCommandArgs(invocation, member);
    }

    const requestable = await invocation.context.requestables.retrieve({
      requestString: invocation.commandArgs[0],
      type: 'request-string',
    });
    if (!requestable) {
      await invocation.respond({
        error:
          'There is no requestable by the name of `' +
          invocation.commandArgs[0] +
          '`.',
        type: 'error',
      });
      return;
    }

    const doesMemberHaveRole = member.roles.some(
      (role): boolean => role.id === requestable.role.id
    );
    if (!doesMemberHaveRole) {
      await invocation.respond({
        error: 'I haven\'t given you the "' + requestable.role.name + '" role.',
        type: 'error',
      });
      return;
    }

    await member.removeRole(requestable.role);
    await invocation.respond({
      text: 'I\'ve removed the "' + requestable.role.name + '" role from you.',
      type: 'success',
    });
  }

  private async processNoCommandArgs(
    invocation: CommandInvocation,
    member: Member
  ): Promise<void> {
    const userRequestables = await this.getAllRequestablesUserHas(
      invocation,
      member
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
    invocation: CommandInvocation,
    member: Member
  ): Promise<readonly Requestable[]> {
    const requestables = await invocation.context.requestables.getAll();
    if (requestables.length === 0) {
      throw new Error(
        'There are no requestable roles defined. An admin should use `' +
          invocation.context.serverConfig.commandPrefix +
          'define` to create some roles.'
      );
    }

    const memberRoleIds = new Set(member.roles.map((role): string => role.id));
    return requestables.filter((requestable): boolean =>
      memberRoleIds.has(requestable.role.id)
    );
  }

  private composeAllRequestablesList(
    serverConfig: ServerConfig,
    requestables: readonly Requestable[]
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
