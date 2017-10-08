'use strict';

const botUtils = require('../bot_utils.js');
const assert = require('assert');
const discord = require('discord.io');
const CommandRunner = require('./command-runner');

module.exports = class Phil {
    constructor(db) {
        assert(db);

        this._db = db;

        this._bot = new discord.Client( { token: process.env.DISCORD_BOT_TOKEN, autorun: true } );

        this._commands = require('../commands');

        this._chronos = require('../chronos');
        this._hasStartedChronos = false;

        this._commandRunner = new CommandRunner(this._bot, this._commands, this._chronos, db);
    }

    start() {
        this._isConnectingAfterDisconnect = false;

        this._bot.on('ready', this._onReady.bind(this));
        this._bot.on('message', this._onMessage.bind(this));
        this._bot.on('disconnect', this._onDisconnect.bind(this));
    }

    _onReady() {
        console.log('Logged in as %s - %s\n', this._bot.username, this._bot.id);

        if (!this._hasStartedChronos) {
            this._chronos.start(this._bot, this._db);
            this._hasStartedChronos = true;
        }

        if (this._isConnectingAfterDisconnect) {
            botUtils.sendErrorMessage({
                bot: this._bot,
                channelId: process.env.ADMIN_CHANNEL_ID,
                message: 'Encountered an unexpected shutdown, @' + process.env.BOT_MANAGER_USERNAME + '. The logs should be in Heroku. I\'ve recovered though and connected again.'
            });
            this._isConnectingAfterDisconnect = false;
        }
    }

    _onMessage(user, userId, channelId, message, event) {
        this._commandRunner.runMessage(user, userId, channelId, message);
    }

    _onDisconnect(err, code) {
        console.error('Discord.io disconnected of its own accord.');
        console.error('Code: ' + code);
        if (err) {
            console.error(err);
        }
        console.error('Reconnecting now...');
        this._isConnectingAfterDisconnect = true;
        this._bot.connect();
    }
};