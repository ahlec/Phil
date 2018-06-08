import { DirectMessageProcessor, IProcessorActiveToken } from '../direct-message-processors/@base';
import { TimezoneQuestionnaireProcessor } from '../direct-message-processors/timezone-questionnaire';
import SuggestSessionListener from '../direct-message-processors/suggest-session-listener';

import { Phil } from './phil';
import { IPrivateMessage } from 'phil';
import { DiscordPromises } from '../promises/discord';
const util = require('util');

export class DirectMessageDispatcher {
    private readonly processorsInPriorityOrder : DirectMessageProcessor[] = [
        new SuggestSessionListener(),
        new TimezoneQuestionnaireProcessor()
    ];

    constructor(private readonly phil : Phil) {
    }

    async process(message : IPrivateMessage) {
        for (let processor of this.processorsInPriorityOrder) {
            try {
                const token = await processor.canProcess(this.phil, message);
                if (token.isActive) {
                    await processor.process(this.phil, message, token);
                    return;
                }

            } catch (err) {
                this.reportError(err, processor);
                return;
            }
        }
    }

    private reportError(err : Error, processor : DirectMessageProcessor) {
        console.error(err);

        if (typeof(err) !== 'string') {
            err = util.inspect(err);
        }

        DiscordPromises.sendEmbedMessage(this.phil.bot, this.phil.globalConfig.botManagerUserId, {
            color: 0xCD5555,
            title: ':no_entry: Processor Error',
            description: err,
            footer: {
                text: 'processor: ' + processor.handle
            }
        });
    }
};
