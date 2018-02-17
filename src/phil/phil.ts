'use strict';

const botUtils = require('../phil/utils');
const assert = require('assert');
import { Client } from 'discord.io';
import { CommandRunner } from './command-runner';
const ChronoManager = require('./chrono-manager');
const AnalyzerManager = require('./analyzer-manager');
const greeting = require('./greeting');
import { DiscordMessage } from './discord-message';
import { Database } from './database';

function ignoreDiscordCode(code) {
    return (code === 1000); // General disconnect code
}

export class Phil {
    private readonly _db : Database;
    private readonly _bot : Client;
    private _commandRunner : CommandRunner;
    private _shouldSendDisconnectedMessage : boolean;

    constructor(db: Database) {
        this._db = db;

        this._bot = new Client({ token: process.env.DISCORD_BOT_TOKEN, autorun: true });

        require('../commands')
            .then(commands => this._createCommandRunner(commands))
            .catch(err => this._reportStartupError(err));
        require('../chronos')
            .then(chronos => this._createChronoManager(chronos))
            .catch(err => this._reportStartupError(err));
        require('../analyzers')
            .then(analyzers => this._createAnalyzerManager(analyzers));
    }

    public start() {
        this._shouldSendDisconnectedMessage = false;

        this._bot.on('ready', this._onReady.bind(this));
        this._bot.on('message', this._onMessage.bind(this));
        this._bot.on('disconnect', this._onDisconnect.bind(this));
        this._bot.on('guildMemberAdd', this._onMemberAdd.bind(this));
    }

    private _createCommandRunner(commands) {
        this._commandRunner = new CommandRunner(this._bot, commands, this._db);
    }

    private _createChronoManager(chronos) {
        this._chronoManager = new ChronoManager(this._bot, chronos, this._db);
    }

    private _reportStartupError(err) {
        console.error('[STARTUP ERROR] %s', err);
        console.error(err);
        process.exit(1);
    }

    private _createAnalyzerManager(analyzers) {
        this._analyzerManager = new AnalyzerManager(this._bot, analyzers, this._db);
    }

    private _onReady() {
        console.log('Logged in as %s - %s\n', this._bot.username, this._bot.id);

        this._chronoManager.start();

        if (this._shouldSendDisconnectedMessage) {
            botUtils.sendErrorMessage({
                bot: this._bot,
                channelId: process.env.BOT_COMMAND_CHANNEL_ID,
                message: 'Encountered an unexpected shutdown, @' + process.env.BOT_MANAGER_USERNAME + '. The logs should be in Heroku. I\'ve recovered though and connected again.'
            });
            this._shouldSendDisconnectedMessage = false;
        }
    }

    private _onMessage(user : string, userId : string, channelId, msg, event) {
        const message = new DiscordMessage(event, this._bot);

        if (this._isOwnMessage(message)) {
            this._handleOwnMessage(msg, event);
            return;
        }

        if (this._shouldIgnoreMessage(message)) {
            return;
        }

        if (this._chronoManager) {
            this._chronoManager.recordNewMessageInChannel(channelId);
        }

        if (!this._commandRunner || !this._analyzerManager) {
            return;
        }

        if (this._commandRunner.isCommand(message)) {
            this._commandRunner.runMessage(message);
        } else {
            this._analyzerManager.analyzeMessage(message);
        }
    }

    private _isOwnMessage(message : DiscordMessage) : boolean {
        return (message.userId === this._bot.id);
    }

    private _shouldIgnoreMessage(message : DiscordMessage) : boolean {
        const user = this._bot.users[message.userId];
        if (!user) {
            console.log('yes');
            return true;
        }

        if (user.bot) {
            return true;
        }

        return false;
    }

    private _handleOwnMessage(msg, event) {
        const MESSAGE_TYPE_CHANNEL_PINNED_MESSAGE = 6; // https://discordapp.com/developers/docs/resources/channel#message-object-message-types
        if (event.d.type !== MESSAGE_TYPE_CHANNEL_PINNED_MESSAGE) {
            return;
        }

        // I dislike those messages that say 'Phil has pinned a message to this channel.'
        // So Phil is going to delete his own when he encounters them.
        console.log('Phil posted an empty message (id %s) to channel %s. deleting.', event.d.id, event.d.channel_id);
        this._bot.deleteMessage({
            channelID: event.d.channel_id,
            messageID: event.d.id
        });
    }

    private _onDisconnect(err, code) {
        console.error('Discord.io disconnected of its own accord.');
        console.error('Code: ' + code);
        if (err) {
            console.error(err);
        }
        console.error('Reconnecting now...');
        this._shouldSendDisconnectedMessage = !ignoreDiscordCode(code);
        this._bot.connect();
    }

    private _onMemberAdd(member) {
        console.log('A new member has joined the server.');
        greeting(this._bot, member);
    }
};
