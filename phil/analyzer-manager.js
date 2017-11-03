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
        for (let analyzerName in this._analyzers) {
            let analyzer = this._analyzers[analyzerName];
            this._runAnalyzer(analyzerName, analyzer, message);
        }
    }

    _runAnalyzer(analyzerName, analyzer, message) {
        const promise = analyzer(this._bot, message, this._db);
        if (!botUtils.isPromise(promise)) {
            console.error('Analyzer \'%s\' did not return a promise', analyzerName);
        } else {
            promise.catch(err => this._reportAnalyzerError(err, analyzerName));
        }
    }

    _reportAnalyzerError(err, analyzerName) {
        console.error(err);

        if (typeof(err) !== 'string') {
            err = util.inspect(err);
        }

        this._bot.sendMessage({
            to: process.env.BOT_CONTROL_CHANNEL_ID,
            message: ':bangbang: **Analyzer error:** ' + analyzerName + '\n' + err
        });
    }
};