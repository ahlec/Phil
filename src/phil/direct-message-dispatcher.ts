import { IDirectMessageProcessor, IProcessorActiveToken } from '../direct-message-processors/@base';

import SuggestSessionListener from '../direct-message-processors/suggest-session-listener';
import TimezoneQuestionnaireProcessor from '../direct-message-processors/timezone-questionnaire';

import { IPrivateMessage } from 'phil';
import { DiscordPromises } from '../promises/discord';
import Phil from './phil';
const util = require('util');

export default class DirectMessageDispatcher {
    private readonly processorsInPriorityOrder : IDirectMessageProcessor[] = [
        new SuggestSessionListener(),
        new TimezoneQuestionnaireProcessor()
    ];

    constructor(private readonly phil: Phil) {
    }

    public async process(message: IPrivateMessage) {
        for (const processor of this.processorsInPriorityOrder) {
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

    private reportError(err: Error, processor: IDirectMessageProcessor) {
        console.error(err);

        if (typeof(err) !== 'string') {
            err = util.inspect(err);
        }

        DiscordPromises.sendEmbedMessage(this.phil.bot, this.phil.globalConfig.botManagerUserId, {
            color: 0xCD5555,
            description: err,
            footer: {
                text: 'processor: ' + processor.handle
            },
            title: ':no_entry: Processor Error'
        });
    }
};
