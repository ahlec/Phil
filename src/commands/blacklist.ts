import Member from '@phil/discord/Member';

import CommandInvocation from '@phil/CommandInvocation';
import CommandArgs from '@phil/CommandArgs';
import Database from '@phil/database';
import Features from '@phil/features/all-features';
import { HelpGroup } from '@phil/help-groups';
import MessageBuilder from '@phil/message-builder';
import PermissionLevel from '@phil/permission-level';
import Requestable from '@phil/requestables';
import ServerConfig from '@phil/server-config';
import { getRandomArrayEntry, stitchTogetherArray } from '@phil/utils';
import Command, { LoggerDefinition } from './@types';

class BlacklistCommand extends Command {
  public constructor(parentDefinition: LoggerDefinition) {
    super('blacklist', parentDefinition, {
      feature: Features.Requestables,
      helpDescription:
        'Controls the blacklist for a particular requestable, managing whether a user can request a requestable.',
      helpGroup: HelpGroup.Roles,
      permissionLevel: PermissionLevel.AdminOnly,
      versionAdded: 14,
    });
  }

  public async invoke(
    invocation: CommandInvocation,
    database: Database
  ): Promise<void> {
    const commandArgs = new CommandArgs(invocation.commandArgs);
    if (commandArgs.isEmpty) {
      return this.processNoCommandArgs(invocation, database);
    }

    const requestString = commandArgs.readString('requestString');
    const requestable = await Requestable.getFromRequestString(
      invocation.context.server,
      database,
      requestString
    );
    if (!requestable) {
      throw new Error(
        `There is no requestable by the name of ${requestString}'.`
      );
    }

    const member = await commandArgs.readMember(
      'targetUser',
      invocation.context.server,
      { isOptional: true }
    );
    if (!member) {
      return this.replyWithBlacklist(invocation, requestable, requestString);
    }

    await this.toggleMember(
      invocation,
      database,
      requestable,
      requestString,
      member
    );
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

  private async replyWithBlacklist(
    invocation: CommandInvocation,
    requestable: Requestable,
    requestStringUsed: string
  ): Promise<void> {
    const blacklist = await Promise.all(
      Array.from(requestable.blacklistedUserIds).map(
        (userId: string): Promise<Member | null> =>
          invocation.context.server.getMember(userId)
      )
    );
    const blacklistedMembers = blacklist.filter((el): el is Member => !!el);

    let response: string;
    if (blacklistedMembers.length) {
      response = `There ${blacklistedMembers.length === 1 ? 'is' : 'are'} **${
        blacklistedMembers.length
      }** ${
        blacklistedMembers.length === 1 ? 'user' : 'users'
      } on the blacklist for the **${requestable.role.name}** role:\n`;
      response += blacklistedMembers
        .map((member) => `• ${member.displayName}`)
        .join('\n');
    } else {
      response = `There are **no** users on the blacklist for the **${requestable.role.name}** role.`;
    }

    response += `\n\nTo add or remove a user to the blacklist, use \`${invocation.context.serverConfig.commandPrefix}blacklist ${requestStringUsed} [user name]\` to toggle that user on the blacklist.`;

    await invocation.respond({
      color: 'powder-blue',
      description: response,
      fields: null,
      footer: null,
      title: `:name_badge: "${requestable.role.name}" blacklist`,
      type: 'embed',
    });
  }

  private async toggleMember(
    invocation: CommandInvocation,
    database: Database,
    requestable: Requestable,
    requestStringUsed: string,
    member: Member
  ): Promise<void> {
    const result = await requestable.toggleUserBlacklist(
      member.userId,
      database
    );

    if (!result.success) {
      this.error(`requestable: ${requestable.role.id} - ${requestStringUsed}`);
      this.error(`server: ${invocation.context.server.id}`);
      this.error(`member: ${member.userId}`);
      this.error(result.message);
      await invocation.respond({
        color: 'red',
        description: result.message,
        fields: null,
        footer: null,
        title: `:no_entry: Blacklist error encountered`,
        type: 'embed',
      });
      return;
    }

    const isOnBlacklist = requestable.blacklistedUserIds.has(member.userId);
    await invocation.respond({
      color: 'powder-blue',
      description: `**${member.displayName}** was ${
        isOnBlacklist ? 'added to' : 'removed from'
      } the blacklist for all requestables that give **${
        requestable.role.name
      }**.\n\nYou can undo this by using \`${
        invocation.context.serverConfig.commandPrefix
      }blacklist ${requestStringUsed} ${
        member.displayName
      }\` to toggle the member's presence on the list.`,
      fields: null,
      footer: null,
      title: `:name_badge: "${requestable.role.name}" blacklist`,
      type: 'embed',
    });
  }
}

export default BlacklistCommand;
