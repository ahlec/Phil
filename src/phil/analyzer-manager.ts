'use strict';

const util = require('util');

import { Phil } from './phil';
import { DiscordMessage } from './discord-message';
import { Analyzer } from '../analyzers/@types';
import { AnalyzerLookup } from '../analyzers/index';
import { BotUtils } from './utils';
import { DiscordPromises } from '../promises/discord';
import { ServerConfig } from './server-config';

export class AnalyzerManager {
    constructor(private readonly phil : Phil) {
    }

    analyzeMessage(message : DiscordMessage) {
        for (let analyzerName in AnalyzerLookup) {
            let analyzer = AnalyzerLookup[analyzerName];
            this.runAnalyzer(analyzerName, analyzer, message);
        }
    }

    private async runAnalyzer(analyzerName : string, analyzer : Analyzer, message : DiscordMessage) {
        try {
            await analyzer.process(this.phil, message);
        } catch (err) {
            this.reportAnalyzerError(err, message.serverConfig, analyzerName);
        }
    }

    private reportAnalyzerError(err : Error, serverConfig : ServerConfig, analyzerName : string) {
        console.error(err);

        if (typeof(err) !== 'string') {
            err = util.inspect(err);
        }

        DiscordPromises.sendEmbedMessage(this.phil.bot, serverConfig.botControlChannel.id, {
            color: 0xCD5555,
            title: ':no_entry: Analyzer Error',
            description: err,
            footer: {
                text: 'analyzer: ' + analyzerName
            }
        });
    }
};
