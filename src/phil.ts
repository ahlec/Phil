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
import Member from './discord/Member';
import ReceivedServerMessage from './discord/ReceivedServerMessage';
import ServerSubmissionsCollection from './ServerSubmissionsCollection';
import ServerRequestablesCollection from './ServerRequestablesCollection';
import ReceivedDirectMessage from './discord/ReceivedDirectMessage';
import Client from './discord/Client';
import Message from './discord/Message';
import { EmbedField } from './discord/MessageTemplate';
import { ClientError, ClientWarning, Reaction } from './discord/types';

type RecognizedReceivedMessage = ReceivedServerMessage | ReceivedDirectMessage;

export default class Phil extends Logger {
  public readonly serverDirectory: ServerDirectory;
  private readonly commandRunner: CommandRunner;
  public readonly chronoManager: ChronoManager;
  private readonly directMessageDispatcher: DirectMessageDispatcher;
  private readonly reactableProcessor: ReactableProcessor;

  constructor(
    public readonly discordClient: Client,
    public readonly db: Database
  ) {
    super(new LoggerDefinition('Phil'));

    this.serverDirectory = new ServerDirectory(this);
    this.commandRunner = new CommandRunner(this, this.db);
    this.chronoManager = new ChronoManager(
      this.discordClient,
      this.db,
      this.serverDirectory
    );
    this.directMessageDispatcher = new DirectMessageDispatcher(this);
    this.reactableProcessor = new ReactableProcessor(this);

    discordClient.on('message-received', this.onMessage);
    discordClient.on('member-joined-server', this.handleMemberJoinedServer);
    discordClient.on('reaction-added', this.handleReactionAdded);
    discordClient.on('error', this.handleError);
    discordClient.on('warning', this.handleWarning);

    this.chronoManager.start();
  }

  private onMessage = async (
    message: ReceivedDirectMessage | ReceivedServerMessage
  ): Promise<void> => {
    if (this.shouldIgnoreMessage(message)) {
      return;
    }

    if (message instanceof ReceivedServerMessage) {
      if (this.chronoManager) {
        this.chronoManager.recordNewMessageInChannel(message.channel.id);
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
        this.discordClient,
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

  private shouldIgnoreMessage(message: RecognizedReceivedMessage): boolean {
    let isBot: boolean;
    if (message instanceof ReceivedServerMessage) {
      isBot = message.sender.user.isBot;
    } else {
      isBot = message.sender.isBot;
    }

    return isBot;
  }

  private handleError = (error: ClientError): void => {
    this.handleErrorOrWarningReport('error', error);
  };

  private handleWarning = (warning: ClientWarning): void => {
    this.handleErrorOrWarningReport('warning', warning);
  };

  private handleErrorOrWarningReport(
    type: 'error' | 'warning',
    event: ClientError | ClientWarning
  ): void {
    let log: (message: string) => void;
    let embedColor: 'yellow' | 'red';
    let emoji: string;
    switch (type) {
      case 'error': {
        log = (message) => this.error(message);
        embedColor = 'red';
        emoji = ':stop_sign:';
        break;
      }
      case 'warning': {
        log = (message) => this.warn(message);
        embedColor = 'yellow';
        emoji = ':warning:';
        break;
      }
    }

    log(`{${type.toUpperCase()}} ${event.message}`);
    Object.entries(event.data).forEach(([key, value]): void => {
      log(`> '${key}': ${value}`);
    });

    const botManager = this.discordClient.getUser(
      GlobalConfig.botManagerUserId
    );
    if (botManager) {
      botManager.sendDirectMessage({
        color: embedColor,
        description: event.message,
        fields: Object.entries(event.data).map(
          ([key, value]): EmbedField => ({
            name: key,
            value: value.toString(),
          })
        ),
        footer: null,
        title: `${emoji} ${type.toUpperCase()}`,
        type: 'embed',
      });
    }
  }

  private handleMemberJoinedServer = async (
    member: Member,
    server: Server
  ): Promise<void> => {
    const serverConfig = await this.serverDirectory.getServerConfig(server);
    if (!serverConfig) {
      this.error(
        `I wanted to greet new member ${member.user.id} in server ${server.id}, but I do not have server config for there.`
      );
      return;
    }

    try {
      const determination = await shouldAutomaticallyGreetMember(
        this.db,
        server.id,
        serverConfig,
        member
      );
      if (!determination.shouldGreet) {
        if (determination.messageToShareWithAdmins) {
          await serverConfig.botControlChannel.sendMessage({
            text: `${member.displayName} joined the server just now, but I didn't greet them because: ${determination.messageToShareWithAdmins}`,
            type: 'plain',
          });
        }

        return;
      }

      const greeting = greetMember(serverConfig, member);
      if (!greeting.valid) {
        this.error(
          `Error greeting member '${member.user.id}': ${greeting.reason}`
        );
        return;
      }

      await serverConfig.introductionsChannel.sendMessage(greeting.message);
    } catch (err) {
      this.error(
        `Uncaught exception when trying to greet new member ${member.user.id} in server ${server.id}.`
      );
      this.error(err);
    }
  };

  private handleReactionAdded = (
    reaction: Reaction,
    message: Message
  ): void => {
    this.reactableProcessor.processReactionAdded(reaction, message);
  };
}
