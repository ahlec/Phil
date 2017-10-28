'use strict';

const botUtils = require('../bot_utils.js');
const assert = require('assert');
const discord = require('discord.io');
const CommandRunner = require('./command-runner');
const discordMessage = require('./discord-message');

function ignoreDiscordCode(code) {
    return (code === 1000); // General disconnect code
}

module.exports = class Phil {
    constructor(db) {
        assert(db);

        this._db = db;

        this._bot = new discord.Client( { token: process.env.DISCORD_BOT_TOKEN, autorun: true } );

        this._analyzers = require('../analyzers');

        this._chronos = require('../chronos');
        this._hasStartedChronos = false;

        require('../commands').then(commands => this._createCommandRunner(commands));

    }

    start() {
        this._shouldSendDisconnectedMessage = false;

        this._bot.on('ready', this._onReady.bind(this));
        this._bot.on('message', this._onMessage.bind(this));
        this._bot.on('disconnect', this._onDisconnect.bind(this));
    }

    _createCommandRunner(commands) {
        this._commandRunner = new CommandRunner(this._bot, commands, this._chronos, this._db);
    }

    _onReady() {
        console.log('Logged in as %s - %s\n', this._bot.username, this._bot.id);

        if (!this._hasStartedChronos) {
            this._chronos.start(this._bot, this._db);
            this._hasStartedChronos = true;
        }

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
        const message = discordMessage(event);
        if (this._commandRunner) {
            this._commandRunner.runMessage(message);
        }
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
};