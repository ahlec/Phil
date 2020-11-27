import {
  Client as DiscordJsClient,
  DiscordAPIError,
  DMChannel as DiscordJsDMChannel,
  Guild as DiscordJsGuild,
  GuildMember as DiscordJsGuildMember,
  Message as DiscordJsMessage,
  MessageReaction as DiscordJsMessageReaction,
  NewsChannel as DiscordJsNewsChannel,
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
  ClientDebugData,
  ClientError,
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

function getDataFieldsFromError(err: unknown): Record<string, string | number> {
  if (err instanceof DiscordAPIError) {
    return {
      code: err.code,
      'error type': 'DiscordAPIError',
      'http code': err.httpStatus,
      message: err.message,
    };
  }

  if (err instanceof Error) {
    return {
      'error type': 'Error',
      'error typeof': typeof err,
      message: err.message,
      name: err.name,
    };
  }

  return {
    'error type': 'unknown',
    'error typeof': typeof err,
  };
}

function getDataFieldsForServer(
  guild: DiscordJsGuild
): Record<string, string | number> {
  return {
    serverId: guild.id,
    serverName: `[${guild.nameAcronym}] ${guild.name}`,
  };
}

function getDataFieldsForChannel(
  channel: DiscordJsTextChannel | DiscordJsDMChannel | DiscordJsNewsChannel
): Record<string, string | number> {
  if (channel instanceof DiscordJsDMChannel) {
    if (channel.partial) {
      return {
        'channel is partial': 'true',
        'channel type': 'dm',
        channelId: channel.id,
      };
    }

    return {
      'channel type': 'dm',
      channelId: channel.id,
    };
  }

  return {
    ...getDataFieldsForServer(channel.guild),
    'channel type':
      channel instanceof DiscordJsNewsChannel
        ? 'server (news)'
        : 'server (regular)',
    channelId: channel.id,
    channelName: `#${channel.name}`,
  };
}

function getDataFieldsForUser(
  user: DiscordJsUser
): Record<string, string | number> {
  if (user.partial) {
    return {
      'user is partial': 'true',
      userId: user.id,
    };
  }

  return {
    userId: user.id,
    userName: `${user.username}#${user.discriminator}`,
  };
}

function getDataFieldsForMember(
  member: DiscordJsGuildMember
): Record<string, string | number> {
  if (member.partial) {
    return {
      'member is partial': 'true',
      userId: member.id,
    };
  }

  return {
    ...getDataFieldsForUser(member.user),
    ...getDataFieldsForServer(member.guild),
  };
}

class Client extends EventEmitter<{
  debug: DebugEventHandler;
  error: ErrorEventHandler;
  'member-joined-server': MemberJoinedServerEventHandler;
  'reaction-added': ReactionAddedToMessageEventHandler;
  'user-message-received': MessageReceivedEventHandler;
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
        data: getDataFieldsFromError(err),
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
              ...getDataFieldsFromError(e),
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
              ...getDataFieldsForUser(internalMessage.author),
              messageId: internalMessage.id,
            },
            message: 'Resolved a partial author of a received message.',
          },
        ]);
      } catch (e) {
        this.emit('error', [
          {
            data: {
              ...getDataFieldsFromError(e),
              ...getDataFieldsForUser(internalMessage.author),
              messageId: internalMessage.id,
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

    if (internalMessage.author.bot) {
      // We're only concerned about reporting messages from users here, and we
      // ignore messages from bots. This is in part because there's no interactions
      // between the two, and then also to handle edge cases.
      //
      // For example, Carl-bot (https://carl.gg/) doesn't play nicely with this
      // bot. Carl-bot will exist in a server with Snowflake A user ID, but then
      // will use webhooks to post to that server with Snowflake B user ID, who
      // isn't part of the server, so calls to look up this user will fail.
      // Furthermore, "Snowflake B" seems to be a pool of IDs or perhaps be
      // variable such that a hardcoded mapping doesn't appear feasible.
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
                ...getDataFieldsForChannel(internalMessage.channel),
                ...getDataFieldsForUser(internalMessage.author),
                messageId: internalMessage.id,
              },
              message:
                'Resolved a partial DM channel encountered in a message received event.',
            },
          ]);
        } catch (e) {
          this.emit('error', [
            {
              data: {
                ...getDataFieldsFromError(e),
                ...getDataFieldsForChannel(internalMessage.channel),
                ...getDataFieldsForUser(internalMessage.author),
                messageId: internalMessage.id,
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
      let internalMember: DiscordJsGuildMember;
      try {
        internalMember = await internalMessage.channel.guild.members.fetch(
          internalMessage.author.id
        );
      } catch (e) {
        this.emit('error', [
          {
            data: {
              ...getDataFieldsFromError(e),
              ...getDataFieldsForChannel(internalMessage.channel),
              ...getDataFieldsForUser(internalMessage.author),
              messageId: internalMessage.id,
            },
            message:
              'Encountered an error attempting to fetch the membership information for a message received in guild channel.',
          },
        ]);
        return;
      }

      if (!internalMember) {
        this.emit('error', [
          {
            data: {
              ...getDataFieldsForChannel(internalMessage.channel),
              ...getDataFieldsForUser(internalMessage.author),
              messageId: internalMessage.id,
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
          ...getDataFieldsForChannel(internalMessage.channel),
          ...getDataFieldsForUser(internalMessage.author),
          messageId: internalMessage.id,
        },
        message:
          "Received a message in a news channel, which I don't know how to process.",
      });
      return;
    }

    this.emit('user-message-received', [message]);
  };

  private handleGuildMemberAdd = async (
    internalMember: DiscordJsGuildMember
  ): Promise<void> => {
    if (internalMember.partial) {
      try {
        await internalMember.fetch();
        this.emit('debug', [
          {
            data: getDataFieldsForMember(internalMember),
            message: 'Fetched a partial member from a guild member add event',
          },
        ]);
      } catch (e) {
        this.emit('error', [
          {
            data: {
              ...getDataFieldsFromError(e),
              ...getDataFieldsForMember(internalMember),
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
            data: getDataFieldsForMember(internalMember),
            message:
              'Fetched a partial user for a member from a guild member add event',
          },
        ]);
      } catch (e) {
        this.emit('error', [
          {
            data: {
              ...getDataFieldsFromError(e),
              ...getDataFieldsForMember(internalMember),
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
    const messageIsFull = await this.resolvePartial(
      internalReaction.message,
      () => ({
        data: {
          ...getDataFieldsForChannel(internalReaction.message.channel),
          emoji: internalReaction.emoji.toString(),
          isReactionPartial: internalReaction.partial ? 'true' : 'false',
          messageId: internalReaction.message.id,
        },
        message: 'Fetched a partial message for a message reaction added event',
      }),
      (err) => ({
        data: {
          ...getDataFieldsFromError(err),
          messageId: internalReaction.message.id,
        },
        message:
          'Encountered an error fetching the partial message for a message reaction added event.',
      })
    );
    if (!messageIsFull) {
      return;
    }

    const reactionIsFull = await this.resolvePartial(
      internalReaction,
      () => ({
        data: {
          ...getDataFieldsForChannel(internalReaction.message.channel),
          emoji: internalReaction.emoji.toString(),
          messageId: internalReaction.message.id,
        },
        message:
          'Fetched a partial reaction object for a message reaction added event',
      }),
      (err) => ({
        data: {
          ...getDataFieldsFromError(err),
          ...getDataFieldsForChannel(internalReaction.message.channel),
          emoji: internalReaction.emoji.toString(),
          messageId: internalReaction.message.id,
        },
        message:
          'Encountered an error fetching the partial reaction for a message reaction added event.',
      })
    );
    if (!reactionIsFull) {
      return;
    }

    const userIsFull = await this.resolvePartial(
      user,
      () => ({
        data: {
          ...getDataFieldsForChannel(internalReaction.message.channel),
          ...getDataFieldsForUser(user),
          emoji: internalReaction.emoji.toString(),
          messageId: internalReaction.message.id,
        },
        message: 'Fetched a partial user for a message reaction added event',
      }),
      (err) => ({
        data: {
          ...getDataFieldsFromError(err),
          ...getDataFieldsForChannel(internalReaction.message.channel),
          ...getDataFieldsForUser(user),
          emoji: internalReaction.emoji.toString(),
          messageId: internalReaction.message.id,
        },
        message:
          'Encountered an error fetching the partial user for a message reaction added event.',
      })
    );
    if (!userIsFull) {
      return;
    }

    let channel: TextChannel | UsersDirectMessagesChannel;
    if (internalReaction.message.channel instanceof DiscordJsTextChannel) {
      channel = new TextChannel(
        internalReaction.message.channel,
        new Server(internalReaction.message.channel.guild)
      );
    } else if (internalReaction.message.channel instanceof DiscordJsDMChannel) {
      const channelIsFull = await this.resolvePartial(
        internalReaction.message.channel,
        () => ({
          data: {
            ...getDataFieldsForChannel(internalReaction.message.channel),
            ...getDataFieldsForUser(user),
            emoji: internalReaction.emoji.toString(),
            messageId: internalReaction.message.id,
          },
          message:
            'Fetched a partial DM channel for a message reaction added event',
        }),
        (err) => ({
          data: {
            ...getDataFieldsFromError(err),
            ...getDataFieldsForChannel(internalReaction.message.channel),
            ...getDataFieldsForUser(user),
            emoji: internalReaction.emoji.toString(),
            messageId: internalReaction.message.id,
          },
          message:
            'Encountered an error fetching the partial DM channel for a message reaction added event.',
        })
      );
      if (!channelIsFull) {
        return;
      }

      channel = new UsersDirectMessagesChannel(
        internalReaction.message.channel
      );
    } else {
      this.emitWarning({
        data: {
          ...getDataFieldsForChannel(internalReaction.message.channel),
          emoji: internalReaction.emoji.toString(),
          messageId: internalReaction.message.id,
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

  private async resolvePartial<
    T extends { partial: boolean; fetch: () => Promise<unknown> }
  >(
    entity: T,
    makeSuccessDebug: () => ClientDebugData,
    makeErrorData: (e: unknown) => ClientError
  ): Promise<boolean> {
    if (!entity.partial) {
      return true;
    }

    try {
      await entity.fetch();
      this.emit('debug', [makeSuccessDebug()]);
      return true;
    } catch (e) {
      this.emit('error', [makeErrorData(e)]);
      return false;
    }
  }
}

export default Client;
