'use strict';

const botUtils = require('../bot_utils');
const util = require('util');

module.exports = class AnalyzerManager {
    constructor(bot, analyzers, db)
    {
        this._bot = bot;
        this._analyzers = analyzers;
        this._db = db;
    }

    analyzeMessage(message) {
        console.log('analyzing message \'%s\'', message.content);
    }
};