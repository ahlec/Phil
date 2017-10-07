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

        this._commandRunner = new CommandRunner(this._bot, this._commands, this._chronos, db);
    }

    start() {
        this._chronos.start(this._bot, this._db);

        this._bot.on('ready', this._onReady.bind(this));
        this._bot.on('message', this._onMessage.bind(this));
    }

    _onReady() {
        console.log('Logged in as %s - %s\n', this._bot.username, this._bot.id);
    }

    _onMessage(user, userId, channelId, message, event) {
        this._commandRunner.runMessage(user, userId, channelId, message);
    }
};