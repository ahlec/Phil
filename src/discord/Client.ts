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

const DISCORD_ROUTINE_RECONNECT_REQUEST_DISCONNECT_CODE = 1000;

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

      const handleDisconnect = (): void => {
        console.log('error!!!!');
        console.log(arguments);
        removeEventListeners();
        reject(new Error('Encountered error while trying to connect.'));
      };

      const handleReady = (): void => {
        console.log('ready!!!');
        console.log(arguments);
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
        message: 'Discord client disconnected due to an error',
        data: {
          code,
          message,
        },
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
        message: 'Received a message that had no author information.',
        data: {
          messageId: event.d.id,
        },
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
          message:
            'Received a direct message from a user that could not be retrieved.',
          data: {
            messageId: event.d.id,
            channelId: event.d.channel_id,
          },
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
          message:
            "Received a message that doesn't appear to be a direct message, but couldn't be found in channels lookup.",
          data: {
            messageId: event.d.id,
            channelId: event.d.channel_id,
          },
        });
        return;
      }

      const server = this.getServer(rawChannel.guild_id);
      if (!server) {
        this.emitWarning({
          message:
            "Received a public message from a channel whose server couldn't be found.",
          data: {
            messageId: event.d.id,
            channelId: event.d.channel_id,
            serverId: rawChannel.guild_id,
          },
        });
        return;
      }

      const member = await server.getMember(event.d.author.id);
      if (!member) {
        this.emitWarning({
          message:
            'Received a public message in a server from a user whose membership information could not be retrieved.',
          data: {
            messageId: event.d.id,
            channelId: event.d.channel_id,
            serverId: server.id,
            userId: event.d.author.id,
          },
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
        message:
          'Received a member-joined-server event for a server that cannot be found.',
        data: {
          serverId: rawMember.guild_id,
        },
      });
      return;
    }

    const user = this.getUser(rawMember.id);
    if (!user) {
      this.emitWarning({
        message:
          "Received a member-joined-server event for a user who couldn't be found.",
        data: {
          serverId: rawMember.guild_id,
          userId: rawMember.id,
        },
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
    event: OfficialDiscordPayload<any>
  ): void => {
    if (event.t !== 'MESSAGE_REACTION_ADD') {
      return;
    }

    const reactionEvent: OfficialDiscordReactionEvent = event.d;
    this.internalClient.getMessage(
      {
        channelID: reactionEvent.channel_id,
        messageID: reactionEvent.message_id,
      },
      (err, data): void => {
        if (err) {
          this.emitWarning({
            message:
              'Received an error attempting to look up a message involved in a reaction-added event.',
            data: {
              channelId: reactionEvent.channel_id,
              messageId: reactionEvent.message_id,
            },
          });
          return;
        }

        console.log('alec!!');
        console.log(data);
        console.log(typeof data);
      }
    );
  };

  private emitWarning(warning: ClientWarning): void {
    this.emit('warning', [warning]);
  }
}

export default Client;
