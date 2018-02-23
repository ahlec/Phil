'use strict';

const util = require('util');

import { Client as DiscordIOClient } from 'discord.io';
import { Database } from './database';
import { DiscordMessage } from './discord-message';
import { Analyzer } from '../analyzers/@types';
import { AnalyzerLookup } from '../analyzers/index';
import { BotUtils } from './utils';
import { instance as DiscordPromises } from '../promises/discord';

export class AnalyzerManager {
    private readonly _bot : DiscordIOClient;
    private readonly _db : Database;

    constructor(bot : DiscordIOClient, db : Database) {
        this._bot = bot;
        this._db = db;
    }

    analyzeMessage(message : DiscordMessage) {
        for (let analyzerName in AnalyzerLookup) {
            let analyzer = AnalyzerLookup[analyzerName];
            this._runAnalyzer(analyzerName, analyzer, message);
        }
    }

    private _runAnalyzer(analyzerName : string, analyzer : Analyzer, message : DiscordMessage) {
        const promise = analyzer(this._bot, message, this._db);
        if (!BotUtils.isPromise(promise)) {
            console.error('Analyzer \'%s\' did not return a promise', analyzerName);
        } else {
            promise.catch(err => this._reportAnalyzerError(err, analyzerName));
        }
    }

    private _reportAnalyzerError(err : Error, analyzerName : string) {
        console.error(err);

        if (typeof(err) !== 'string') {
            err = util.inspect(err);
        }

        DiscordPromises.sendEmbedMessage(this._bot, process.env.BOT_CONTROL_CHANNEL_ID, {
            color: 0xCD5555,
            title: ':no_entry: Analyzer Error',
            description: err,
            footer: {
                text: 'analyzer: ' + analyzerName
            }
        });
    }
};
