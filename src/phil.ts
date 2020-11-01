import {
  Client as DiscordIOClient,
  Member as DiscordIOMember,
  Server as DiscordIOServer,
} from 'discord.io';
import {
  OfficialDiscordMessage,
  OfficialDiscordPayload,
  OfficialDiscordReactionEvent,
} from 'official-discord';
import ChronoManager from './ChronoManager';
import CommandRunner from './CommandRunner';
import Database from './database';
import DirectMessageDispatcher from './DirectMessageDispatcher';
import GlobalConfig from './GlobalConfig';
import { greetMember, shouldAutomaticallyGreetMember } from './greeting';
import Logger from './Logger';
import LoggerDefinition from './LoggerDefinition';
import ReactableProcessor from './reactables/processor';
import ServerDirectory from './server-directory';
import CommandInvocation from './CommandInvocation';
import ServerBucketsCollection from './ServerBucketsCollection';
import Server from './discord/Server';
import { sendMessageTemplate } from './utils/discord-migration';
import Member from './discord/Member';
import ReceivedServerMessage from './discord/ReceivedServerMessage';
import User from './discord/User';
import ServerSubmissionsCollection from './ServerSubmissionsCollection';
import ServerRequestablesCollection from './ServerRequestablesCollection';
import TextChannel from './discord/TextChannel';
import ReceivedDirectMessage from './discord/ReceivedDirectMessage';

function ignoreDiscordCode(code: number): boolean {
  return code === 1000; // General disconnect code
}

type ParseResult<T> =
  | {
      success: true;
      data: T;
    }
  | {
      success: false;
      error: string;
    };

type RecognizedReceivedMessage = ReceivedServerMessage | ReceivedDirectMessage;

export default class Phil extends Logger {
  public readonly bot: DiscordIOClient;
  public readonly serverDirectory: ServerDirectory;
  private readonly commandRunner: CommandRunner;
  private readonly chronoManager: ChronoManager;
  private readonly directMessageDispatcher: DirectMessageDispatcher;
  private readonly reactableProcessor: ReactableProcessor;
  private shouldSendDisconnectedMessage: boolean;

  constructor(public readonly db: Database) {
    super(new LoggerDefinition('Phil'));

    this.bot = new DiscordIOClient({
      autorun: true,
      token: GlobalConfig.discordBotToken,
    });
    this.serverDirectory = new ServerDirectory(this);
    this.commandRunner = new CommandRunner(this, this.db);
    this.chronoManager = new ChronoManager(this, this.serverDirectory);
    this.directMessageDispatcher = new DirectMessageDispatcher(this);
    this.reactableProcessor = new ReactableProcessor(this);
  }

  public start(): void {
    this.shouldSendDisconnectedMessage = false;

    this.bot.on('ready', this.onReady);
    this.bot.on('message', this.onMessage);
    this.bot.on('disconnect', this.onDisconnect);
    this.bot.on('guildMemberAdd', this.onMemberAdd);
    this.bot.on('any', this.onRawWebSocketEvent);
  }

  public getServerFromChannelId(channelId: string): DiscordIOServer | null {
    if (!this.bot.channels[channelId]) {
      return null;
    }

    const serverId = this.bot.channels[channelId].guild_id;
    const server = this.bot.servers[serverId];
    if (!server) {
      return null;
    }

    return server;
  }

  private onReady = async (): Promise<void> => {
    this.write(`Logged in as ${this.bot.username} - ${this.bot.id}`);

    this.chronoManager.start();

    if (this.shouldSendDisconnectedMessage) {
      await sendMessageTemplate(this.bot, GlobalConfig.botManagerUserId, {
        type: 'error',
        error:
          "I experienced an unexpected shutdown. The logs should be in Heroku. I've recovered and connected again.",
      });
      this.shouldSendDisconnectedMessage = false;
    }
  };

  private onMessage = async (
    user: string,
    userId: string,
    channelId: string,
    msg: string,
    event: OfficialDiscordPayload<OfficialDiscordMessage>
  ): Promise<void> => {
    const parseResult = await this.parseMessage(event);
    if (!parseResult.success) {
      this.error(parseResult.error);
      return;
    }

    const message = parseResult.data;

    if (this.isMessageFromPhil(message)) {
      this.handleOwnMessage(event);
      return;
    }

    if (this.shouldIgnoreMessage(message)) {
      return;
    }

    if (message instanceof ReceivedServerMessage) {
      if (this.chronoManager) {
        this.chronoManager.recordNewMessageInChannel(channelId);
      }

      const serverConfig = await this.serverDirectory.getServerConfig(
        message.channel.server
      );
      if (!serverConfig) {
        this.error(
          `Received public message in channel '${message.channel.id}' but don't have server config for server '${message.channel.server.id}'.`
        );
        return;
      }

      const buckets = new ServerBucketsCollection(
        this.bot,
        this.db,
        message.channel.server,
        serverConfig
      );
      const invocation = CommandInvocation.parseFromMessage(
        {
          buckets,
          channelId: message.channel.id,
          requestables: new ServerRequestablesCollection(
            this.db,
            message.channel.server
          ),
          server: message.channel.server,
          serverConfig,
          submissions: new ServerSubmissionsCollection(
            this.db,
            buckets,
            message.channel.server,
            serverConfig
          ),
        },
        message
      );
      if (invocation) {
        this.commandRunner.invoke(invocation);
      }
    } else {
      this.directMessageDispatcher.process(message);
      return;
    }
  };

  private async parseMessage(
    event: OfficialDiscordPayload<OfficialDiscordMessage>
  ): Promise<ParseResult<RecognizedReceivedMessage>> {
    if (!event.d.author) {
      return {
        success: false,
        error: `Message '${event.d.id}' does not have an author.`,
      };
    }

    const isDirectMessage = event.d.channel_id in this.bot.directMessages;
    if (isDirectMessage) {
      const rawUser = this.bot.users[event.d.author.id];
      if (!rawUser) {
        return {
          success: false,
          error: `Received a direct message from unrecognized user '${event.d.author.id}'.`,
        };
      }

      const user = new User(this.bot, rawUser, event.d.author.id);
      return {
        success: true,
        data: new ReceivedDirectMessage(
          this.bot,
          event.d.id,
          event.d.content,
          user
        ),
      };
    }

    const rawServer = this.getServerFromChannelId(event.d.channel_id);
    if (!rawServer) {
      return {
        success: false,
        error: `Received a message from channel '${event.d.channel_id}', which is not a channel I recognize.`,
      };
    }

    const server = new Server(this.bot, rawServer, rawServer.id);
    const member = await server.getMember(event.d.author.id);
    if (!member) {
      return {
        success: false,
        error: `Received message '${event.d.id}' from user '${event.d.author.id}', but they aren't found in server '${server.id}'.`,
      };
    }

    const channel = new TextChannel(
      rawServer.channels[event.d.channel_id],
      server,
      event.d.channel_id
    );
    return {
      success: true,
      data: new ReceivedServerMessage(
        this.bot,
        event.d.id,
        event.d.content,
        member,
        channel
      ),
    };
  }

  private getSenderId(message: RecognizedReceivedMessage): string {
    if (message instanceof ReceivedDirectMessage) {
      return message.sender.id;
    }

    return message.sender.user.id;
  }

  private isMessageFromPhil(message: RecognizedReceivedMessage): boolean {
    return this.getSenderId(message) === this.bot.id;
  }

  private shouldIgnoreMessage(message: RecognizedReceivedMessage): boolean {
    const user = this.bot.users[this.getSenderId(message)];
    if (!user) {
      return true;
    }

    if (user.bot) {
      return true;
    }

    return false;
  }

  private handleOwnMessage(
    event: OfficialDiscordPayload<OfficialDiscordMessage>
  ): void {
    const MESSAGE_TYPE_CHANNEL_PINNED_MESSAGE = 6; // https://discordapp.com/developers/docs/resources/channel#message-object-message-types
    if (event.d.type !== MESSAGE_TYPE_CHANNEL_PINNED_MESSAGE) {
      return;
    }

    // I dislike those messages that say 'Phil has pinned a message to this channel.'
    // So Phil is going to delete his own when he encounters them.
    this.write(
      `Posted an empty message (id ${event.d.id}) to channel ${event.d.channel_id}. Deleting.`
    );
    try {
      this.bot.deleteMessage({
        channelID: event.d.channel_id,
        messageID: event.d.id,
      });
    } catch (err) {
      this.error(`Could not delete empty message ${event.d.id}.`);
      this.error(err);
    }
  }

  private onDisconnect = (err: Error, code: number): void => {
    this.error(`Discord.io disconnected of its own accord. (Code: ${code})`);
    this.error(err);
    this.write('Attempting to reconnect now...');
    this.shouldSendDisconnectedMessage = !ignoreDiscordCode(code);
    this.bot.connect();
  };

  private onMemberAdd = async (
    rawMember: DiscordIOMember & {
      /* special field for this event */ guild_id: string;
    }
  ): Promise<void> => {
    const { guild_id: serverId } = rawMember;
    const rawServer = this.bot.servers[serverId];
    this.write(`A new member (${rawMember.id}) has joined server ${serverId}.`);
    if (!rawServer) {
      this.error(`I do not recognize server ${serverId} as existing.`);
      return;
    }

    const server = new Server(this.bot, rawServer, serverId);
    const serverConfig = await this.serverDirectory.getServerConfig(server);
    if (!serverConfig) {
      this.error(
        `I wanted to greet new member ${rawMember.id} in server ${server.id}, but I do not have server config for there.`
      );
      return;
    }

    const rawUser = this.bot.users[rawMember.id];
    if (!rawUser) {
      this.error(
        `Couldn't greet member '${rawMember.id}' in server '${server.id}' because they weren't in the users lookup.`
      );
      return;
    }

    const member = new Member(
      this.bot,
      rawMember,
      serverId,
      new User(this.bot, rawUser, rawMember.id)
    );

    try {
      const shouldGreet = await shouldAutomaticallyGreetMember(
        this.db,
        serverId,
        serverConfig,
        member
      );
      if (!shouldGreet) {
        return;
      }

      const greeting = greetMember(serverConfig, member);
      if (!greeting.valid) {
        this.error(
          `Error greeting member '${rawMember.id}': ${greeting.reason}`
        );
        return;
      }

      await sendMessageTemplate(
        this.bot,
        serverConfig.introductionsChannel.id,
        greeting.message
      );
    } catch (err) {
      this.error(
        `Uncaught exception when trying to greet new member ${rawMember.id} in server ${server.id}.`
      );
      this.error(err);
    }
  };

  private onRawWebSocketEvent = (
    event: OfficialDiscordPayload<unknown>
  ): void => {
    if (event.t === 'MESSAGE_REACTION_ADD') {
      this.reactableProcessor.processReactionAdded(
        event.d as OfficialDiscordReactionEvent
      );
    }
  };
}
