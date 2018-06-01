'use strict';

const assert = require('assert');
import { Client as DiscordIOClient, Member as DiscordIOMember, Server as DiscordIOServer } from 'discord.io';
import { CommandRunner } from './command-runner';
import { ChronoManager } from './chrono-manager';
import { DirectMessageDispatcher } from './direct-message-dispatcher';
import { ReactableProcessor } from './reactables/processor';
import { greetNewMember } from './greeting';
import { DiscordMessage } from './discord-message';
import { Database } from './database';
import { OfficialDiscordMessage, OfficialDiscordPayload, OfficialDiscordReactionEvent } from 'official-discord';
import { BotUtils } from './utils';
import { ServerDirectory } from './server-directory';
import { GlobalConfig } from './global-config';

function ignoreDiscordCode(code : number) {
    return (code === 1000); // General disconnect code
}

export class Phil {
    readonly bot : DiscordIOClient;
    readonly serverDirectory : ServerDirectory;
    private readonly _commandRunner : CommandRunner;
    private readonly _chronoManager : ChronoManager;
    private readonly _directMessageDispatcher : DirectMessageDispatcher;
    private readonly _reactableProcessor : ReactableProcessor;
    private _shouldSendDisconnectedMessage : boolean;

    constructor(public readonly db: Database, public readonly globalConfig : GlobalConfig) {
        this.bot = new DiscordIOClient({ token: globalConfig.discordBotToken, autorun: true });
        this.serverDirectory = new ServerDirectory(this);
        this._commandRunner = new CommandRunner(this, this.bot, this.db);
        this._chronoManager = new ChronoManager(this, this.serverDirectory);
        this._directMessageDispatcher = new DirectMessageDispatcher(this);
        this._reactableProcessor = new ReactableProcessor(this);
    }

    start() {
        this._shouldSendDisconnectedMessage = false;

        this.bot.on('ready', this._onReady.bind(this));
        this.bot.on('message', this._onMessage.bind(this));
        this.bot.on('disconnect', this._onDisconnect.bind(this));
        this.bot.on('guildMemberAdd', this.onMemberAdd.bind(this));
        this.bot.on('any', this._onRawWebSocketEvent.bind(this));
    }

    getServerFromChannelId(channelId : string) : DiscordIOServer | null {
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

    private _reportStartupError(err : Error) {
        console.error('[STARTUP ERROR] %s', err);
        console.error(err);
        process.exit(1);
    }

    private _onReady() {
        console.log('Logged in as %s - %s\n', this.bot.username, this.bot.id);

        this._chronoManager.start();

        if (this._shouldSendDisconnectedMessage) {
            BotUtils.sendErrorMessage({
                bot: this.bot,
                channelId: this.globalConfig.botManagerUserId,
                message: 'I experienced an unexpected shutdown. The logs should be in Heroku. I\'ve recovered and connected again.'
            });
            this._shouldSendDisconnectedMessage = false;
        }
    }

    private async _onMessage(user : string, userId : string, channelId : string, msg : string, event : OfficialDiscordPayload<OfficialDiscordMessage>) {
        const message = await DiscordMessage.parse(event, this);

        if (this.isMessageFromPhil(message)) {
            this._handleOwnMessage(event);
            return;
        }

        if (this._shouldIgnoreMessage(message)) {
            return;
        }

        if (message.isDirectMessage) {
            this._directMessageDispatcher.process(message);
            return;
        }

        if (this._chronoManager) {
            this._chronoManager.recordNewMessageInChannel(channelId);
        }

        if (this._commandRunner.isCommand(message)) {
            this._commandRunner.runMessage(message);
        }
    }

    private isMessageFromPhil(message : DiscordMessage) : boolean {
        return (message.userId === this.bot.id);
    }

    private _shouldIgnoreMessage(message : DiscordMessage) : boolean {
        const user = this.bot.users[message.userId];
        if (!user) {
            console.log('yes');
            return true;
        }

        if (user.bot) {
            return true;
        }

        return false;
    }

    private _handleOwnMessage(event : OfficialDiscordPayload<OfficialDiscordMessage>) {
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

    private _onDisconnect(err : Error, code : number) {
        console.error('Discord.io disconnected of its own accord.');
        console.error('Code: ' + code);
        if (err) {
            console.error(err);
        }
        console.error('Reconnecting now...');
        this._shouldSendDisconnectedMessage = !ignoreDiscordCode(code);
        this.bot.connect();
    }

    private async onMemberAdd(member : DiscordIOMember, event : any) {
        console.log('A new member has joined the server.');
        const serverId = (member as any).guild_id; // special field for this event
        const server = this.bot.servers[serverId];
        assert(server);

        const serverConfig = await this.serverDirectory.getServerConfig(server);
        await greetNewMember(this, serverConfig, member);
    }

    private _onRawWebSocketEvent(event : OfficialDiscordPayload<any>) {
        if (event.t === 'MESSAGE_REACTION_ADD') {
            this._reactableProcessor.processReactionAdded(event.d as OfficialDiscordReactionEvent);
        }
    }
};
