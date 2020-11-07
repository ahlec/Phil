import {
  Client as DiscordJsClient,
  DMChannel as DiscordJsDMChannel,
  GuildMember as DiscordJsGuildMember,
  Message as DiscordJsMessage,
  MessageReaction as DiscordJsMessageReaction,
  PermissionString as DiscordJsPermissionString,
  TextChannel as DiscordJsTextChannel,
  User as DiscordJsUser,
} from 'discord.js';
import ReceivedDirectMessage from './ReceivedDirectMessage';
import ReceivedServerMessage from './ReceivedServerMessage';

import Server from './Server';
import User from './User';
import {
  ClientWarning,
  DebugEventHandler,
  ErrorEventHandler,
  MessageReceivedEventHandler,
  MemberJoinedServerEventHandler,
  ReactionAddedToMessageEventHandler,
  WarningEventHandler,
} from './types';
import TextChannel from './TextChannel';
import Member from './Member';

import EventEmitter from './internals/EventEmitter';
import OutboundMessage from './OutboundMessage';
import UsersDirectMessagesChannel from './UsersDirectMessagesChannel';

const REQUIRED_BOT_PERMISSIONS: readonly DiscordJsPermissionString[] = [
  'MANAGE_GUILD',
  'MANAGE_ROLES',
  'MANAGE_CHANNELS',
  'KICK_MEMBERS',
  'CHANGE_NICKNAME',
  'MANAGE_NICKNAMES',
  'VIEW_CHANNEL',
  'SEND_MESSAGES',
  'MANAGE_MESSAGES',
  'EMBED_LINKS',
  'READ_MESSAGE_HISTORY',
  'USE_EXTERNAL_EMOJIS',
  'ADD_REACTIONS',
];

class Client extends EventEmitter<{
  debug: DebugEventHandler;
  error: ErrorEventHandler;
  'message-received': MessageReceivedEventHandler;
  'member-joined-server': MemberJoinedServerEventHandler;
  'reaction-added': ReactionAddedToMessageEventHandler;
  warning: WarningEventHandler;
}> {
  public static async connect(token: string): Promise<Client> {
    const internalClient = new DiscordJsClient({
      // Our usage of Phil doesn't really require him to hold on to messages
      // for long periods of time.
      messageCacheLifetime: 60,
      partials: [
        'MESSAGE',
        // Allow us to receive partial channels (namely, direct messages opened with
        // Phil in previous processes).
        'CHANNEL',
        // Allow us to receive reaction events for messages that aren't in the cache
        // (eg reactable posts from previous processes)
        'REACTION',
        'USER',
        'GUILD_MEMBER',
      ],
    });

    await internalClient.login(token);
    return new Client(internalClient);
  }

  private constructor(private readonly internalClient: DiscordJsClient) {
    super();

    this.internalClient.on('error', this.handleError);
    this.internalClient.on('message', this.handleMessageEvent);
    this.internalClient.on('guildMemberAdd', this.handleGuildMemberAdd);
    this.internalClient.on('messageReactionAdd', this.handleMessageReactionAdd);
  }

  public get botUser(): User {
    if (!this.internalClient.user) {
      throw new Error(
        'The internal client does not have user information to fill `botUser` somehow.'
      );
    }

    if (this.internalClient.user.partial) {
      throw new Error("The internal client's user is a partial, somehow.");
    }

    return new User(this.internalClient.user);
  }

  public getInviteUrl(): Promise<string> {
    return this.internalClient.generateInvite({
      permissions: REQUIRED_BOT_PERMISSIONS,
    });
  }

  public async getServer(serverId: string): Promise<Server | null> {
    const internalServer = await this.internalClient.guilds.fetch(serverId);
    if (!internalServer) {
      return null;
    }

    return new Server(internalServer);
  }

  /**
   * Retrieves a user via their snowflake ID. If there is no user in Discord's
   * database with that snowflake, OR if there is a user but this bot does not
   * share any servers with that user, this will return null.
   * @param userId The snowflake ID of the user to be retrieved.
   */
  public async getUser(userId: string): Promise<User | null> {
    // `fetch` checks cache and if there's a cache miss or the cache has a partial,
    // it will make the API call.
    const internalUser = await this.internalClient.users.fetch(userId);
    if (!internalUser) {
      return null;
    }

    if (internalUser.partial) {
      throw new Error(
        'Encountered a partial user in Client.getUser coming back from fetch'
      );
    }

    return new User(internalUser);
  }

  private handleError = (err: Error): void => {
    this.emit('error', [
      {
        data: {
          message: err instanceof Error ? err.message : String(err),
          stack: (err instanceof Error && err.stack) || '<none>',
          type: typeof err,
        },
        message: 'DiscordJS client encountered an error',
      },
    ]);
  };

  private handleMessageEvent = async (
    internalMessage: DiscordJsMessage
  ): Promise<void> => {
    // If this is a partial, make sure we fetch the information for it.
    if (internalMessage.partial) {
      try {
        await internalMessage.fetch();
        this.emit('debug', [
          {
            data: {
              messageId: internalMessage.id,
            },
            message: 'Resolved a partial message in a received message event.',
          },
        ]);
      } catch (e) {
        this.emit('error', [
          {
            data: {
              error: e instanceof Error ? e.message : String(e),
              messageId: internalMessage.id,
            },
            message:
              'Encountered an error attempting to fetch a partial message received in a message received event.',
          },
        ]);
        return;
      }
    }

    if (internalMessage.author.partial) {
      try {
        await internalMessage.author.fetch();
        this.emit('debug', [
          {
            data: {
              messageId: internalMessage.id,
              userId: internalMessage.author.id,
            },
            message: 'Resolved a partial author of a received message.',
          },
        ]);
      } catch (e) {
        this.emit('error', [
          {
            data: {
              error: e instanceof Error ? e.message : String(e),
              messageId: internalMessage.id,
              userId: internalMessage.author.id,
            },
            message:
              'Encountered an error fetching the partial author of a message in a message received event.',
          },
        ]);
        return;
      }
    }

    if (internalMessage.author.id === this.internalClient.user?.id) {
      // This was a message sent from the bot. It's not a "message received"
      // because we sent it.
      // If we still want to surface these as events, then we should make a
      // separate event for it. But that also seems unnecessary since all of
      // the functions that send messages as the bot will return the message
      // snowflake already.
      return;
    }

    let message: ReceivedServerMessage | ReceivedDirectMessage;
    if (internalMessage.channel instanceof DiscordJsDMChannel) {
      if (internalMessage.channel.partial) {
        try {
          await internalMessage.channel.fetch();
          this.emit('debug', [
            {
              data: {
                channelId: internalMessage.channel.id,
                messageId: internalMessage.id,
                userId: internalMessage.author.id,
              },
              message:
                'Resolved a partial DM channel encountered in a message received event.',
            },
          ]);
        } catch (e) {
          this.emit('error', [
            {
              data: {
                channelId: internalMessage.channel.id,
                error: e instanceof Error ? e.message : String(e),
                messageId: internalMessage.id,
                userId: internalMessage.author.id,
              },
              message:
                'Encountered an error fetching the partial DM channel in a message received event.',
            },
          ]);
          return;
        }
      }

      message = new ReceivedDirectMessage(internalMessage);
    } else if (internalMessage.channel instanceof DiscordJsTextChannel) {
      const server = new Server(internalMessage.channel.guild);
      const internalMember = internalMessage.channel.members.get(
        internalMessage.author.id
      );

      if (!internalMember) {
        this.emit('error', [
          {
            data: {
              channelId: internalMessage.channel.id,
              messageId: internalMessage.id,
              serverId: internalMessage.channel.guild.id,
              userId: internalMessage.author.id,
            },
            message:
              "Received a message in a server channel from a user whose member information couldn't be found.",
          },
        ]);
        return;
      }

      message = new ReceivedServerMessage(
        internalMessage,
        internalMessage.channel,
        new Member(internalMember),
        new TextChannel(internalMessage.channel, server)
      );
    } else {
      this.emitWarning({
        data: {
          channelId: internalMessage.channel.id,
          messageId: internalMessage.id,
          serverId: internalMessage.channel.guild.id,
          userId: internalMessage.author.id,
        },
        message:
          "Received a message in a news channel, which I don't know how to process.",
      });
      return;
    }

    this.emit('message-received', [message]);
  };

  private handleGuildMemberAdd = async (
    internalMember: DiscordJsGuildMember
  ): Promise<void> => {
    if (internalMember.partial) {
      try {
        await internalMember.fetch();
        this.emit('debug', [
          {
            data: {
              userId: internalMember.id,
            },
            message: 'Fetched a partial member from a guild member add event',
          },
        ]);
      } catch (e) {
        this.emit('error', [
          {
            data: {
              error: e instanceof Error ? e.message : String(e),
              userId: internalMember.id,
            },
            message:
              'Encountered an error fetching the partial member in a guild member add event.',
          },
        ]);
        return;
      }
    }

    if (internalMember.user.partial) {
      try {
        await internalMember.user.fetch();
        this.emit('debug', [
          {
            data: {
              serverId: internalMember.guild.id,
              userId: internalMember.id,
            },
            message:
              'Fetched a partial user for a member from a guild member add event',
          },
        ]);
      } catch (e) {
        this.emit('error', [
          {
            data: {
              error: e instanceof Error ? e.message : String(e),
              serverId: internalMember.guild.id,
              userId: internalMember.id,
            },
            message:
              'Encountered an error fetching the partial user for a member in a guild member add event.',
          },
        ]);
        return;
      }
    }

    const server = new Server(internalMember.guild);
    const member = new Member(internalMember);
    this.emit('member-joined-server', [member, server]);
  };

  private handleMessageReactionAdd = async (
    internalReaction: DiscordJsMessageReaction,
    user: DiscordJsUser
  ): Promise<void> => {
    if (internalReaction.message.partial) {
      try {
        await internalReaction.message.fetch();
        this.emit('debug', [
          {
            data: {
              channelId: internalReaction.message.channel.id,
              emoji: internalReaction.emoji.toString(),
              isReactionPartial: internalReaction.partial ? 'true' : 'false',
              messageId: internalReaction.message.id,
            },
            message:
              'Fetched a partial message for a message reaction added event',
          },
        ]);
      } catch (e) {
        this.emit('error', [
          {
            data: {
              error: e instanceof Error ? e.message : String(e),
              messageId: internalReaction.message.id,
            },
            message:
              'Encountered an error fetching the partial message for a message reaction added event.',
          },
        ]);
        return;
      }
    }

    if (internalReaction.partial) {
      try {
        await internalReaction.fetch();
        this.emit('debug', [
          {
            data: {
              channelId: internalReaction.message.channel.id,
              emoji: internalReaction.emoji.toString(),
              messageId: internalReaction.message.id,
            },
            message:
              'Fetched a partial reaction object for a message reaction added event',
          },
        ]);
      } catch (e) {
        this.emit('error', [
          {
            data: {
              channelId: internalReaction.message.channel.id,
              emoji: internalReaction.emoji.toString(),
              error: e instanceof Error ? e.message : String(e),
              messageId: internalReaction.message.id,
            },
            message:
              'Encountered an error fetching the partial reaction for a message reaction added event.',
          },
        ]);
        return;
      }
    }

    if (user.partial) {
      try {
        await user.fetch();
        this.emit('debug', [
          {
            data: {
              channelId: internalReaction.message.channel.id,
              emoji: internalReaction.emoji.toString(),
              messageId: internalReaction.message.id,
              userId: user.id,
            },
            message:
              'Fetched a partial user for a message reaction added event',
          },
        ]);
      } catch (e) {
        this.emit('error', [
          {
            data: {
              channelId: internalReaction.message.channel.id,
              emoji: internalReaction.emoji.toString(),
              error: e instanceof Error ? e.message : String(e),
              messageId: internalReaction.message.id,
              userId: user.id,
            },
            message:
              'Encountered an error fetching the partial user for a message reaction added event.',
          },
        ]);
        return;
      }
    }

    let channel: TextChannel | UsersDirectMessagesChannel;
    if (internalReaction.message.channel instanceof DiscordJsTextChannel) {
      channel = new TextChannel(
        internalReaction.message.channel,
        new Server(internalReaction.message.channel.guild)
      );
    } else if (internalReaction.message.channel instanceof DiscordJsDMChannel) {
      channel = new UsersDirectMessagesChannel(
        internalReaction.message.channel
      );
    } else {
      this.emitWarning({
        data: {
          channelId: internalReaction.message.channel.id,
          emoji: internalReaction.emoji.toString(),
          messageId: internalReaction.message.id,
          serverId: internalReaction.message.channel.guild.id,
        },
        message: 'Received a reaction event in an unsupported channel type.',
      });
      return;
    }

    this.emit('reaction-added', [
      {
        name: internalReaction.emoji.name,
        user: new User(user),
      },
      new OutboundMessage(internalReaction.message, channel),
    ]);
  };

  private emitWarning(warning: ClientWarning): void {
    this.emit('warning', [warning]);
  }
}

export default Client;
