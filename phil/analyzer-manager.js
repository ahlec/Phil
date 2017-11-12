'use strict';

const botUtils = require('../phil/utils');
const util = require('util');
const discord = require('../promises/discord');

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

        discord.sendEmbedMessage(this._bot, process.env.BOT_CONTROL_CHANNEL_ID, {
            color: 0xCD5555,
            title: ':no_entry: Analyzer Error',
            description: err,
            footer: {
                text: 'analyzer: ' + analyzerName
            }
        });
    }
};
