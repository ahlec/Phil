import ReceivedDirectMessage from '@phil/discord/ReceivedDirectMessage';

import { DirectMessageProcessor } from './direct-message-processors/@base';

import BotManagerCommandListener from './direct-message-processors/BotManagerCommandListener';
import SuggestSessionListener from './direct-message-processors/suggest-session-listener';
import TimezoneQuestionnaireProcessor from './direct-message-processors/timezone-questionnaire';

import GlobalConfig from './GlobalConfig';
import Logger from './Logger';
import LoggerDefinition from './LoggerDefinition';
import Phil from './phil';
import { inspect } from 'util';
import { sendMessageTemplate } from './utils/discord-migration';

const LOGGER_DEFINITION = new LoggerDefinition('Direct Message Dispatcher');

export default class DirectMessageDispatcher extends Logger {
  private readonly processorsInPriorityOrder: DirectMessageProcessor[] = [
    new SuggestSessionListener(),
    new TimezoneQuestionnaireProcessor(),
    new BotManagerCommandListener(LOGGER_DEFINITION),
  ];

  constructor(private readonly phil: Phil) {
    super(LOGGER_DEFINITION);
  }

  public async process(message: ReceivedDirectMessage): Promise<void> {
    for (const processor of this.processorsInPriorityOrder) {
      try {
        const token = await processor.canProcess(this.phil, message);
        if (token.isActive) {
          await processor.process(this.phil, message, token);
        }
      } catch (err) {
        await this.reportError(err, processor);
      }
    }
  }

  private async reportError(
    err: Error,
    processor: DirectMessageProcessor
  ): Promise<void> {
    this.error(err);
    await sendMessageTemplate(this.phil.bot, GlobalConfig.botManagerUserId, {
      color: 'red',
      description: inspect(err),
      fields: null,
      footer: 'processor: ' + processor.handle,
      title: ':no_entry: Processor Error',
      type: 'embed',
    });
  }
}
