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
import Greeting from './greeting';
import Logger from './Logger';
import LoggerDefinition from './LoggerDefinition';
import { parseMessage } from './messages/@parsing';
import MessageBase from './messages/base';
import PublicMessage from './messages/public';
import ReactableProcessor from './reactables/processor';
import ServerDirectory from './server-directory';
import { sendErrorMessage } from './utils';
import CommandInvocation from './CommandInvocation';

function ignoreDiscordCode(code: number): boolean {
  return code === 1000; // General disconnect code
}

function isPublicMessage(object: MessageBase): object is PublicMessage {
  return 'serverConfig' in object;
}

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
    this.commandRunner = new CommandRunner(this, this.bot, this.db);
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
      await sendErrorMessage({
        bot: this.bot,
        channelId: GlobalConfig.botManagerUserId,
        message:
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
    const message = await parseMessage(this, event);

    if (this.isMessageFromPhil(message)) {
      this.handleOwnMessage(event);
      return;
    }

    if (this.shouldIgnoreMessage(message)) {
      return;
    }

    if (isPublicMessage(message)) {
      if (this.chronoManager) {
        this.chronoManager.recordNewMessageInChannel(channelId);
      }

      const invocation = CommandInvocation.parseFromMessage(
        this.bot,
        {
          channelId: message.channelId,
          serverConfig: message.serverConfig,
        },
        message
      );
      if (invocation) {
        this.commandRunner.invoke(invocation, message);
      }
    } else {
      this.directMessageDispatcher.process(message);
      return;
    }
  };

  private isMessageFromPhil(message: MessageBase): boolean {
    return message.userId === this.bot.id;
  }

  private shouldIgnoreMessage(message: MessageBase): boolean {
    const user = this.bot.users[message.userId];
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
    member: DiscordIOMember & {
      /* special field for this event */ guild_id: string;
    }
  ): Promise<void> => {
    const { guild_id: serverId } = member;
    const server = this.bot.servers[serverId];
    this.write(`A new member (${member.id}) has joined server ${serverId}.`);
    if (!server) {
      this.error(`I do not recognize server ${serverId} as existing.`);
      return;
    }

    const serverConfig = await this.serverDirectory.getServerConfig(server);
    if (!serverConfig) {
      this.error(
        `I wanted to greet new member ${member.id} in server ${server.id}, but I do not have server config for there.`
      );
      return;
    }

    try {
      const greeting = new Greeting(this.bot, this.db, serverConfig, member);
      await greeting.send(serverConfig.introductionsChannel.id);
    } catch (err) {
      this.error(
        `Uncaught exception when trying to greet new member ${member.id} in server ${server.id}.`
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
