'use strict';

const util = require('util');

import { Phil } from './phil';
import { DiscordMessage } from './discord-message';
import { Analyzer } from '../analyzers/@types';
import { AnalyzerLookup } from '../analyzers/index';
import { BotUtils } from './utils';
import { DiscordPromises } from '../promises/discord';

export class AnalyzerManager {
    constructor(private readonly phil : Phil) {
    }

    analyzeMessage(message : DiscordMessage) {
        for (let analyzerName in AnalyzerLookup) {
            let analyzer = AnalyzerLookup[analyzerName];
            this._runAnalyzer(analyzerName, analyzer, message);
        }
    }

    private async _runAnalyzer(analyzerName : string, analyzer : Analyzer, message : DiscordMessage) {
        try {
            await analyzer.process(this.phil, message);
        } catch (err) {
            this._reportAnalyzerError(err, analyzerName);
        }
    }

    private _reportAnalyzerError(err : Error, analyzerName : string) {
        console.error(err);

        if (typeof(err) !== 'string') {
            err = util.inspect(err);
        }

        DiscordPromises.sendEmbedMessage(this.phil.bot, process.env.BOT_CONTROL_CHANNEL_ID, {
            color: 0xCD5555,
            title: ':no_entry: Analyzer Error',
            description: err,
            footer: {
                text: 'analyzer: ' + analyzerName
            }
        });
    }
};
