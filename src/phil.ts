const assert = require('assert');
import ChronoManager from 'chrono-manager';
import CommandRunner from 'command-runner';
import Database from 'database';
import DirectMessageDispatcher from 'direct-message-dispatcher';
import { Client as DiscordIOClient, Member as DiscordIOMember, Server as DiscordIOServer } from 'discord.io';
import GlobalConfig from 'global-config';
import { greetNewMember } from 'greeting';
import { parseMessage } from 'messages/@parsing';
import MessageBase from 'messages/base';
import PublicMessage from 'messages/public';
import { OfficialDiscordMessage, OfficialDiscordPayload, OfficialDiscordReactionEvent } from 'official-discord';
import ReactableProcessor from 'reactables/processor';
import ServerDirectory from 'server-directory';
import { BotUtils } from 'utils';

function ignoreDiscordCode(code: number) {
    return (code === 1000); // General disconnect code
}

function isPublicMessage(object: MessageBase): object is PublicMessage {
    return 'serverConfig' in object;
}

export default class Phil {
    public readonly bot: DiscordIOClient;
    public readonly serverDirectory: ServerDirectory;
    private readonly commandRunner: CommandRunner;
    private readonly chronoManager: ChronoManager;
    private readonly directMessageDispatcher: DirectMessageDispatcher;
    private readonly reactableProcessor: ReactableProcessor;
    private shouldSendDisconnectedMessage: boolean;

    constructor(public readonly db: Database, public readonly globalConfig: GlobalConfig) {
        this.bot = new DiscordIOClient({ token: globalConfig.discordBotToken, autorun: true });
        this.serverDirectory = new ServerDirectory(this);
        this.commandRunner = new CommandRunner(this, this.bot, this.db);
        this.chronoManager = new ChronoManager(this, this.serverDirectory);
        this.directMessageDispatcher = new DirectMessageDispatcher(this);
        this.reactableProcessor = new ReactableProcessor(this);
    }

    public start() {
        this.shouldSendDisconnectedMessage = false;

        this.bot.on('ready', this.onReady.bind(this));
        this.bot.on('message', this.onMessage.bind(this));
        this.bot.on('disconnect', this.onDisconnect.bind(this));
        this.bot.on('guildMemberAdd', this.onMemberAdd.bind(this));
        this.bot.on('any', this.onRawWebSocketEvent.bind(this));
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

    private onReady() {
        console.log('Logged in as %s - %s\n', this.bot.username, this.bot.id);

        this.chronoManager.start();

        if (this.shouldSendDisconnectedMessage) {
            BotUtils.sendErrorMessage({
                bot: this.bot,
                channelId: this.globalConfig.botManagerUserId,
                message: 'I experienced an unexpected shutdown. The logs should be in Heroku. I\'ve recovered and connected again.'
            });
            this.shouldSendDisconnectedMessage = false;
        }
    }

    private async onMessage(user: string, userId: string, channelId: string, msg: string, event: OfficialDiscordPayload<OfficialDiscordMessage>) {
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

            if (this.commandRunner.isCommand(message)) {
                this.commandRunner.runMessage(message);
            }
        } else {
            this.directMessageDispatcher.process(message);
            return;
        }
    }

    private isMessageFromPhil(message: MessageBase): boolean {
        return (message.userId === this.bot.id);
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

    private handleOwnMessage(event: OfficialDiscordPayload<OfficialDiscordMessage>) {
        const MESSAGE_TYPE_CHANNEL_PINNED_MESSAGE = 6; // https://discordapp.com/developers/docs/resources/channel#message-object-message-types
        if (event.d.type !== MESSAGE_TYPE_CHANNEL_PINNED_MESSAGE) {
            return;
        }

        // I dislike those messages that say 'Phil has pinned a message to this channel.'
        // So Phil is going to delete his own when he encounters them.
        console.log('Phil posted an empty message (id %s) to channel %s. deleting.', event.d.id, event.d.channel_id);
        this.bot.deleteMessage({
            channelID: event.d.channel_id,
            messageID: event.d.id
        });
    }

    private onDisconnect(err: Error, code: number) {
        console.error('Discord.io disconnected of its own accord.');
        console.error('Code: ' + code);
        if (err) {
            console.error(err);
        }

        console.error('Reconnecting now...');
        this.shouldSendDisconnectedMessage = !ignoreDiscordCode(code);
        this.bot.connect();
    }

    private async onMemberAdd(member: DiscordIOMember, event: any) {
        console.log('A new member has joined the server.');
        const serverId = (member as any).guild_id; // special field for this event
        const server = this.bot.servers[serverId];
        assert(server);

        const serverConfig = await this.serverDirectory.getServerConfig(server);
        await greetNewMember(this, serverConfig, member);
    }

    private onRawWebSocketEvent(event : OfficialDiscordPayload<any>) {
        if (event.t === 'MESSAGE_REACTION_ADD') {
            this.reactableProcessor.processReactionAdded(event.d as OfficialDiscordReactionEvent);
        }
    }
};
