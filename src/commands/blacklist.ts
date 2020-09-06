import { Member as DiscordIOMember } from 'discord.io';
import CommandInvocation from '@phil/CommandInvocation';
import CommandArgs from '@phil/CommandArgs';
import Database from '@phil/database';
import Features from '@phil/features/all-features';
import { HelpGroup } from '@phil/help-groups';
import MessageBuilder from '@phil/message-builder';
import PermissionLevel from '@phil/permission-level';
import Phil from '@phil/phil';
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
    database: Database,
    legacyPhil: Phil
  ): Promise<void> {
    const commandArgs = new CommandArgs(invocation.commandArgs);
    if (commandArgs.isEmpty) {
      return this.processNoCommandArgs(invocation, database);
    }

    const requestString = commandArgs.readString('requestString');
    const requestable = await Requestable.getFromRequestString(
      database,
      invocation.server,
      requestString
    );
    if (!requestable) {
      throw new Error(
        `There is no requestable by the name of ${requestString}'.`
      );
    }

    const member = commandArgs.readMember(
      'targetUser',
      legacyPhil.bot,
      invocation.server,
      true
    );
    if (!member) {
      return this.replyWithBlacklist(
        invocation,
        legacyPhil,
        requestable,
        requestString
      );
    }

    await this.toggleMember(
      legacyPhil,
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
      database,
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
    legacyPhil: Phil,
    requestable: Requestable,
    requestStringUsed: string
  ): Promise<void> {
    const blacklistedUsers = Array.from(requestable.blacklistedUserIds).map(
      (userId: string) => {
        const user = legacyPhil.bot.users[userId];
        if (!user) {
          return `User ${userId} (no longer known by Phil)`;
        }

        const username = `${user.username}#${user.discriminator}`;
        const member = invocation.server.members[userId];

        if (!member) {
          return `${username} - no longer in this server`;
        }

        if (!member.nick) {
          return `${username}`;
        }

        return `${member.nick} (${username})`;
      }
    );

    let response: string;
    if (blacklistedUsers.length) {
      response = `There ${blacklistedUsers.length === 1 ? 'is' : 'are'} **${
        blacklistedUsers.length
      }** ${
        blacklistedUsers.length === 1 ? 'user' : 'users'
      } on the blacklist for the **${requestable.role.name}** role:\n`;
      response += blacklistedUsers
        .map((username) => `• ${username}`)
        .join('\n');
    } else {
      response = `There are **no** users on the blacklist for the **${requestable.role.name}** role.`;
    }

    response += `\n\nTo add or remove a user to the blacklist, use \`${invocation.serverConfig.commandPrefix}blacklist ${requestStringUsed} [user name]\` to toggle that user on the blacklist.`;

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
    legacyPhil: Phil,
    invocation: CommandInvocation,
    database: Database,
    requestable: Requestable,
    requestStringUsed: string,
    member: DiscordIOMember
  ): Promise<void> {
    const result = await requestable.toggleUserBlacklist(member.id, database);
    if (!result.success) {
      this.error(`requestable: ${requestable.role.id} - ${requestStringUsed}`);
      this.error(`server: ${invocation.server.id}`);
      this.error(`member: ${member.id}`);
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

    const isOnBlacklist = requestable.blacklistedUserIds.has(member.id);
    let displayName: string;
    if (member.nick) {
      displayName = member.nick;
    } else {
      const user = legacyPhil.bot.users[member.id];
      displayName = `${user.username}#${user.discriminator}`;
    }

    await invocation.respond({
      color: 'powder-blue',
      description: `**${displayName}** was ${
        isOnBlacklist ? 'added to' : 'removed from'
      } the blacklist for all requestables that give **${
        requestable.role.name
      }**.\n\nYou can undo this by using \`${
        invocation.serverConfig.commandPrefix
      }blacklist ${requestStringUsed} ${displayName}\` to toggle the member's presence on the list.`,
      fields: null,
      footer: null,
      title: `:name_badge: "${requestable.role.name}" blacklist`,
      type: 'embed',
    });
  }
}

export default BlacklistCommand;
