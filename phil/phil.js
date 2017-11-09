'use strict';

const botUtils = require('../bot_utils.js');
const assert = require('assert');
const discord = require('discord.io');
const CommandRunner = require('./command-runner');
const ChronoManager = require('./chrono-manager');
const AnalyzerManager = require('./analyzer-manager');
const discordMessage = require('./discord-message');
const greeting = require('./greeting');
const util = require('util');

function ignoreDiscordCode(code) {
    return (code === 1000); // General disconnect code
}

module.exports = class Phil {
    constructor(db) {
        assert(db);

        this._db = db;

        this._bot = new discord.Client( { token: process.env.DISCORD_BOT_TOKEN, autorun: true } );

        require('../commands')
            .then(commands => this._createCommandRunner(commands))
            .catch(err => this._reportStartupError(err));
        require('../chronos')
            .then(chronos => this._createChronoManager(chronos))
            .catch(err => this._reportStartupError(err));
        require('../analyzers')
            .then(analyzers => this._createAnalyzerManager(analyzers));
    }

    start() {
        this._shouldSendDisconnectedMessage = false;

        this._bot.on('ready', this._onReady.bind(this));
        this._bot.on('message', this._onMessage.bind(this));
        this._bot.on('disconnect', this._onDisconnect.bind(this));
        this._bot.on('guildMemberAdd', this._onMemberAdd.bind(this));
    }

    _createCommandRunner(commands) {
        this._commandRunner = new CommandRunner(this._bot, commands, this._db);
    }

    _createChronoManager(chronos) {
        this._chronoManager = new ChronoManager(this._bot, chronos, this._db);
    }

    _reportStartupError(err) {
        console.error('[STARTUP ERROR] %s', err);
        process.exit(1);
    }

    _createAnalyzerManager(analyzers) {
        this._analyzerManager = new AnalyzerManager(this._bot, analyzers, this._db);
    }

    _onReady() {
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

    _onMessage(user, userId, channelId, msg, event) {
        const message = discordMessage(event, this._bot);
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

    _shouldIgnoreMessage(message) {
        const user = this._bot.users[message.userId];
        if (!user) {
            return true;
        }

        if (user.bot) {
            return true;
        }

        return false;
    }

    _onDisconnect(err, code) {
        console.error('Discord.io disconnected of its own accord.');
        console.error('Code: ' + code);
        if (err) {
            console.error(err);
        }
        console.error('Reconnecting now...');
        this._shouldSendDisconnectedMessage = !ignoreDiscordCode(code);
        this._bot.connect();
    }

    _onMemberAdd(member) {
        console.log('A new member has joined the server.');
        greeting(this._bot, member);
    }
};