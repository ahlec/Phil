import { DirectMessageProcessor, IProcessorActiveToken } from '../direct-message-processors/@base';
import { TimezoneQuestionnaireProcessor } from '../direct-message-processors/timezone-questionnaire';

import { Phil } from './phil';
import { DiscordMessage } from './discord-message';
import { DiscordPromises } from '../promises/discord';
import { ServerConfig } from './server-config';
const util = require('util');

export class DirectMessageDispatcher {
    private readonly processorsInPriorityOrder : DirectMessageProcessor[] = [
        new TimezoneQuestionnaireProcessor()
    ];

    constructor(private readonly phil : Phil) {
    }

    async process(message : DiscordMessage) {
        for (let processor of this.processorsInPriorityOrder) {
            try {
                const token = await processor.canProcess(this.phil, message);
                if (token.isActive) {
                    await processor.process(this.phil, message, token);
                    return;
                }

            } catch (err) {
                this.reportError(err, message.serverConfig, processor);
                return;
            }
        }
    }

    private reportError(err : Error, serverConfig : ServerConfig, processor : DirectMessageProcessor) {
        console.error(err);

        if (typeof(err) !== 'string') {
            err = util.inspect(err);
        }

        DiscordPromises.sendEmbedMessage(this.phil.bot, serverConfig.botControlChannel.id, {
            color: 0xCD5555,
            title: ':no_entry: Processor Error',
            description: err,
            footer: {
                text: 'processor: ' + processor.handle
            }
        });
    }
};
