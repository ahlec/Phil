import { Member as DiscordIOMember } from 'discord.io';
import CommandArgs from '../CommandArgs';
import EmbedColor from '../embed-color';
import Features from '../features/all-features';
import MessageBuilder from '../message-builder';
import PublicMessage from '../messages/public';
import Phil from '../phil';
import { DiscordPromises } from '../promises/discord';
import TempChannelConfirmationReactableFactory from '../reactables/temp-channel-confirmation/factory';
import ServerConfig from '../server-config';
import TemporaryChannel, {
  MAX_NUMBER_EXISTANT_CHANNELS_PER_USER,
} from '../TemporaryChannel';
import TempChannelNameTypeDefinition from '../type-definition/temp-channel-name';
import BotUtils from '../utils';
import Command, { LoggerDefinition } from './@types';

export default class TempChannelCommand extends Command {
  public constructor(parentDefinition: LoggerDefinition) {
    super('tempchannel', parentDefinition, {
      aliases: ['temporarychannel', 'makechannel', 'spawnchannel'],
      feature: Features.TemporaryChannels,
      helpDescription:
        'Creates a temporary text channel around a particular topic that lasts for a couple of hours.',
      versionAdded: 14,
    });
  }

  public async processMessage(
    phil: Phil,
    message: PublicMessage,
    rawCommandArgs: ReadonlyArray<string>
  ): Promise<any> {
    const commandArgs = new CommandArgs(rawCommandArgs);
    if (commandArgs.isEmpty) {
      return this.processNoCommandArgs(phil, message);
    }

    const channelTopic = commandArgs.readString('channel-topic');
    const parseResult = TempChannelNameTypeDefinition.tryParse(channelTopic);
    if (parseResult.wasSuccessful === false) {
      return this.reportError(
        phil,
        message.channelId,
        parseResult.errorMessage
      );
    }

    const { parsedValue: channelName } = parseResult;
    const validityResult = TempChannelNameTypeDefinition.isValid(
      channelName,
      phil,
      message.serverConfig
    );
    if (validityResult.isValid === false) {
      return this.reportError(
        phil,
        message.channelId,
        validityResult.errorMessage
      );
    }

    const numUserChannels = await TemporaryChannel.countUsersChannels(
      phil.db,
      message.server,
      message.userId
    );
    if (numUserChannels >= MAX_NUMBER_EXISTANT_CHANNELS_PER_USER) {
      return this.reportError(
        phil,
        message.channelId,
        `You've created ${numUserChannels} temporary channels recently, and hit your limit of ${MAX_NUMBER_EXISTANT_CHANNELS_PER_USER}.`
      );
    }

    const messageId = await DiscordPromises.sendEmbedMessage(
      phil.bot,
      message.channelId,
      {
        color: EmbedColor.Info,
        description: `You asked me to create the temporary channel **${channelName}**. Is this correct?`,
        title: `Confirm Temporary Channel`,
      }
    );

    const factory = new TempChannelConfirmationReactableFactory(
      phil.bot,
      phil.db,
      {
        channelId: message.channelId,
        messageId,
        tempChannelName: channelName,
        timeLimit: 10,
        user: message.user,
      }
    );
    await factory.create();
  }

  private async processNoCommandArgs(
    phil: Phil,
    message: PublicMessage
  ): Promise<any> {
    const requestables = await Requestable.getAllRequestables(
      phil.db,
      message.server
    );
    if (requestables.length === 0) {
      throw new Error(
        'There are no requestable roles defined. An admin should use `' +
          message.serverConfig.commandPrefix +
          'define` to create some roles.'
      );
    }

    const reply = this.composeAllRequestablesList(
      message.serverConfig,
      requestables
    );
    return DiscordPromises.sendMessageBuilder(
      phil.bot,
      message.channelId,
      reply
    );
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

    const randomRequestable = BotUtils.getRandomArrayEntry(requestables);
    const randomRequestableString = BotUtils.getRandomArrayEntry(
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
    entry += BotUtils.stitchTogetherArray(requestable.requestStrings);
    entry += ' to receive the "' + requestable.role.name + '" role\n';
    return entry;
  }

  private async replyWithBlacklist(
    phil: Phil,
    message: PublicMessage,
    requestable: Requestable,
    requestStringUsed: string
  ): Promise<any> {
    const blacklistedUsers = Array.from(requestable.blacklistedUserIds).map(
      (userId: string) => {
        const user = phil.bot.users[userId];
        if (!user) {
          return `User ${userId} (no longer known by Phil)`;
        }

        const username = `${user.username}#${user.discriminator}`;
        const member = message.server.members[userId];

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
      response += blacklistedUsers.map(username => `• ${username}`).join('\n');
    } else {
      response = `There are **no** users on the blacklist for the **${
        requestable.role.name
      }** role.`;
    }

    response += `\n\nTo add or remove a user to the blacklist, use \`${
      message.serverConfig.commandPrefix
    }blacklist ${requestStringUsed} [user name]\` to toggle that user on the blacklist.`;

    return DiscordPromises.sendEmbedMessage(phil.bot, message.channelId, {
      color: EmbedColor.Info,
      description: response,
      title: `:name_badge: "${requestable.role.name}" blacklist`,
    });
  }

  private async toggleMember(
    phil: Phil,
    message: PublicMessage,
    requestable: Requestable,
    requestStringUsed: string,
    member: DiscordIOMember
  ) {
    const result = await requestable.toggleUserBlacklist(member.id, phil.db);
    if (!result.success) {
      this.error(`requestable: ${requestable.role.id} - ${requestStringUsed}`);
      this.error(`server: ${message.server.id}`);
      this.error(`member: ${member.id}`);
      this.error(result.message);
      return DiscordPromises.sendEmbedMessage(phil.bot, message.channelId, {
        color: EmbedColor.Error,
        description: result.message,
        title: `:no_entry: Blacklist error encountered`,
      });
    }

    const isOnBlacklist = requestable.blacklistedUserIds.has(member.id);
    let displayName: string;
    if (member.nick) {
      displayName = member.nick;
    } else {
      const user = phil.bot.users[member.id];
      displayName = `${user.username}#${user.discriminator}`;
    }
    return DiscordPromises.sendEmbedMessage(phil.bot, message.channelId, {
      color: EmbedColor.Info,
      description: `**${displayName}** was ${
        isOnBlacklist ? 'added to' : 'removed from'
      } the blacklist for all requestables that give **${
        requestable.role.name
      }**.\n\nYou can undo this by using \`${
        message.serverConfig.commandPrefix
      }blacklist ${requestStringUsed} ${displayName}\` to toggle the member's presence on the list.`,
      title: `:name_badge: "${requestable.role.name}" blacklist`,
    });
  }
}
