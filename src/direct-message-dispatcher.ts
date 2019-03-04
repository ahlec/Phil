import { DirectMessageProcessor } from './direct-message-processors/@base';

import SuggestSessionListener from './direct-message-processors/suggest-session-listener';
import TimezoneQuestionnaireProcessor from './direct-message-processors/timezone-questionnaire';

import GlobalConfig from './global-config';
import Logger from './Logger';
import LoggerDefinition from './LoggerDefinition';
import PrivateMessage from './messages/private';
import Phil from './phil';
import { sendEmbedMessage } from './promises/discord';
const util = require('util');

export default class DirectMessageDispatcher extends Logger {
  private readonly processorsInPriorityOrder: DirectMessageProcessor[] = [
    new SuggestSessionListener(),
    new TimezoneQuestionnaireProcessor(),
  ];

  constructor(private readonly phil: Phil) {
    super(new LoggerDefinition('Direct Message Dispatcher'));
  }

  public async process(message: PrivateMessage) {
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

  private reportError(err: Error, processor: DirectMessageProcessor) {
    this.error(err);

    sendEmbedMessage(this.phil.bot, GlobalConfig.botManagerUserId, {
      color: 'error',
      description: util.inspect(err),
      footer: {
        text: 'processor: ' + processor.handle,
      },
      title: ':no_entry: Processor Error',
    });
  }
}
