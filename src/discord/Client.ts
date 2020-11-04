import {
  Client as DiscordIOClient,
  Member as DiscordIOMember,
} from 'discord.io';
import {
  OfficialDiscordMessage,
  OfficialDiscordPayload,
  OfficialDiscordReactionEvent,
} from 'official-discord';
import ReceivedDirectMessage from './ReceivedDirectMessage';
import ReceivedServerMessage from './ReceivedServerMessage';

import Server from './Server';
import User from './User';
import {
  ClientWarning,
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

const DISCORD_ROUTINE_RECONNECT_REQUEST_DISCONNECT_CODE = 1000;
const DISCORD_AUTHENTICATION_FAILED_CODE = 4004;

interface DiscordIOGetMessage {
  author: {
    id: string;
    username: string;
    bot: boolean;
  };
  content: string;
}

interface UndocumentedDiscordIOEmitter {
  once: (
    eventName: string,
    callback: (...data: readonly unknown[]) => void
  ) => void;
  removeListener: (
    eventName: string,
    callback: (...data: readonly unknown[]) => void
  ) => void;
}

class Client extends EventEmitter<{
  error: ErrorEventHandler;
  'message-received': MessageReceivedEventHandler;
  'member-joined-server': MemberJoinedServerEventHandler;
  'reaction-added': ReactionAddedToMessageEventHandler;
  warning: WarningEventHandler;
}> {
  public static connect(token: string): Promise<Client> {
    const internalClient = new DiscordIOClient({
      autorun: true,
      token,
    }) as DiscordIOClient & UndocumentedDiscordIOEmitter;

    return new Promise<Client>((resolve, reject): void => {
      let removeEventListeners: () => void;

      const handleDisconnect = (message: string, code: number): void => {
        removeEventListeners();

        if (code === DISCORD_AUTHENTICATION_FAILED_CODE) {
          reject(new Error('Bot token failed to authenticate'));
          return;
        }

        reject(
          new Error(
            `(${code}) Encountered error while trying to connect: '${message}'`
          )
        );
      };

      const handleReady = (): void => {
        removeEventListeners();
        resolve(new Client(internalClient));
      };

      removeEventListeners = (): void => {
        internalClient.removeListener('ready', handleReady);
        internalClient.removeListener('disconnect', handleDisconnect);
      };

      internalClient.once('ready', handleReady);
      internalClient.once('disconnect', handleDisconnect);
    });
  }

  private constructor(private readonly internalClient: DiscordIOClient) {
    super();

    this.internalClient.on('disconnect', this.handleDisconnect);
    this.internalClient.on('message', this.handleMessageEvent);
    this.internalClient.on('guildMemberAdd', this.handleGuildMemberAdd);
    this.internalClient.on('any', this.handleRawWebSocketEvent);
  }

  public get botUser(): User {
    const internalUser = this.internalClient.users[this.internalClient.id];
    return new User(this.internalClient, internalUser, this.internalClient.id);
  }

  public get inviteUrl(): string {
    return this.internalClient.inviteURL;
  }

  public getServer(serverId: string): Server | null {
    const internalServer = this.internalClient.servers[serverId];
    if (!internalServer) {
      return null;
    }

    return new Server(this.internalClient, internalServer, serverId);
  }

  /**
   * Retrieves a user via their snowflake ID. If there is no user in Discord's
   * database with that snowflake, OR if there is a user but this bot does not
   * share any servers with that user, this will return null.
   * @param userId The snowflake ID of the user to be retrieved.
   */
  public getUser(userId: string): User | null {
    const internalUser = this.internalClient.users[userId];
    if (!internalUser) {
      return null;
    }

    return new User(this.internalClient, internalUser, userId);
  }

  private handleDisconnect = (message: string, code: number): void => {
    this.internalClient.connect();

    if (code === DISCORD_ROUTINE_RECONNECT_REQUEST_DISCONNECT_CODE) {
      return;
    }

    this.emit('error', [
      {
        data: {
          code,
          message,
        },
        message: 'Discord client disconnected due to an error',
      },
    ]);
  };

  private handleMessageEvent = async (
    user: string,
    userId: string,
    channelId: string,
    msg: string,
    event: OfficialDiscordPayload<OfficialDiscordMessage>
  ): Promise<void> => {
    if (!event.d.author) {
      this.emitWarning({
        data: {
          messageId: event.d.id,
        },
        message: 'Received a message that had no author information.',
      });
      return;
    }

    if (event.d.author.id === this.internalClient.id) {
      // This was a message sent from the bot. It's not a "message received"
      // because we sent it.
      // If we still want to surface these as events, then we should make a
      // separate event for it. But that also seems unnecessary since all of
      // the functions that send messages as the bot will return the message
      // snowflake already.
      return;
    }

    let message: ReceivedServerMessage | ReceivedDirectMessage;
    if (this.internalClient.directMessages[event.d.channel_id]) {
      const user = this.getUser(event.d.author.id);
      if (!user) {
        this.emitWarning({
          data: {
            channelId: event.d.channel_id,
            messageId: event.d.id,
          },
          message:
            'Received a direct message from a user that could not be retrieved.',
        });
        return;
      }

      message = new ReceivedDirectMessage(
        this.internalClient,
        event.d.id,
        event.d.content,
        user
      );
    } else {
      const rawChannel = this.internalClient.channels[event.d.channel_id];
      if (!rawChannel) {
        this.emitWarning({
          data: {
            channelId: event.d.channel_id,
            messageId: event.d.id,
          },
          message:
            "Received a message that doesn't appear to be a direct message, but couldn't be found in channels lookup.",
        });
        return;
      }

      const server = this.getServer(rawChannel.guild_id);
      if (!server) {
        this.emitWarning({
          data: {
            channelId: event.d.channel_id,
            messageId: event.d.id,
            serverId: rawChannel.guild_id,
          },
          message:
            "Received a public message from a channel whose server couldn't be found.",
        });
        return;
      }

      const member = await server.getMember(event.d.author.id);
      if (!member) {
        this.emitWarning({
          data: {
            channelId: event.d.channel_id,
            messageId: event.d.id,
            serverId: server.id,
            userId: event.d.author.id,
          },
          message:
            'Received a public message in a server from a user whose membership information could not be retrieved.',
        });
        return;
      }

      message = new ReceivedServerMessage(
        this.internalClient,
        event.d.id,
        event.d.content,
        member,
        new TextChannel(
          this.internalClient,
          event.d.channel_id,
          rawChannel,
          server
        )
      );
    }

    this.emit('message-received', [message]);
  };

  private handleGuildMemberAdd = (
    rawMember: DiscordIOMember & {
      /* special field for this event */ guild_id: string;
    }
  ) => {
    const server = this.getServer(rawMember.guild_id);
    if (!server) {
      this.emitWarning({
        data: {
          serverId: rawMember.guild_id,
        },
        message:
          'Received a member-joined-server event for a server that cannot be found.',
      });
      return;
    }

    const user = this.getUser(rawMember.id);
    if (!user) {
      this.emitWarning({
        data: {
          serverId: rawMember.guild_id,
          userId: rawMember.id,
        },
        message:
          "Received a member-joined-server event for a user who couldn't be found.",
      });
      return;
    }

    const member = new Member(
      this.internalClient,
      rawMember,
      rawMember.guild_id,
      user
    );

    this.emit('member-joined-server', [member, server]);
  };

  private handleRawWebSocketEvent = (
    event: OfficialDiscordPayload<unknown>
  ): void => {
    if (event.t !== 'MESSAGE_REACTION_ADD') {
      return;
    }

    const reactionEvent = event.d as OfficialDiscordReactionEvent;
    this.internalClient.getMessage(
      {
        channelID: reactionEvent.channel_id,
        messageID: reactionEvent.message_id,
      },
      async (err, data: DiscordIOGetMessage): Promise<void> => {
        if (err) {
          this.emitWarning({
            data: {
              channelId: reactionEvent.channel_id,
              messageId: reactionEvent.message_id,
            },
            message:
              'Received an error attempting to look up a message involved in a reaction-added event.',
          });
          return;
        }

        if (data.author.id !== this.internalClient.id) {
          // Not a message sent by the bot
          return;
        }

        let channel: TextChannel | UsersDirectMessagesChannel;
        if (this.internalClient.channels[reactionEvent.channel_id]) {
          const internalChannel = this.internalClient.channels[
            reactionEvent.channel_id
          ];
          const server = this.getServer(internalChannel.guild_id);
          if (!server) {
            this.emitWarning({
              data: {
                channelId: reactionEvent.channel_id,
                messageId: reactionEvent.message_id,
                serverId: internalChannel.guild_id,
              },
              message:
                "Received a reaction event on a public server whose channel could be found but the server couldn't.",
            });
            return;
          }

          channel = new TextChannel(
            this.internalClient,
            reactionEvent.channel_id,
            internalChannel,
            server
          );
        } else if (
          this.internalClient.directMessages[reactionEvent.channel_id]
        ) {
          channel = new UsersDirectMessagesChannel(
            this.internalClient,
            reactionEvent.user_id
          );
        } else {
          this.emitWarning({
            data: {
              channelId: reactionEvent.channel_id,
              messageId: reactionEvent.message_id,
              userId: reactionEvent.user_id,
            },
            message:
              "Received a reaction event in an unknown channel. This could be a direct message channel with a user who hasn't otherwise communicated with me during this instance.",
          });
          return;
        }

        const user = this.getUser(reactionEvent.user_id);
        if (!user) {
          this.emitWarning({
            data: {
              channelId: reactionEvent.channel_id,
              messageId: reactionEvent.message_id,
              userId: reactionEvent.user_id,
            },
            message:
              "Received a reaction event from a user who couldn't be found by the bot.",
          });
          return;
        }

        this.emit('reaction-added', [
          {
            name: reactionEvent.emoji.name,
            user,
          },
          new OutboundMessage(
            this.internalClient,
            channel,
            reactionEvent.message_id
          ),
        ]);
      }
    );
  };

  private emitWarning(warning: ClientWarning): void {
    this.emit('warning', [warning]);
  }
}

export default Client;
