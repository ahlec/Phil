import { IDirectMessageProcessor } from './direct-message-processors/@base';

import SuggestSessionListener from './direct-message-processors/suggest-session-listener';
import TimezoneQuestionnaireProcessor from './direct-message-processors/timezone-questionnaire';

import EmbedColor from './embed-color';
import GlobalConfig from './global-config';
import PrivateMessage from './messages/private';
import Phil from './phil';
import { DiscordPromises } from './promises/discord';
const util = require('util');

export default class DirectMessageDispatcher {
  private readonly processorsInPriorityOrder: IDirectMessageProcessor[] = [
    new SuggestSessionListener(),
    new TimezoneQuestionnaireProcessor(),
  ];

  constructor(private readonly phil: Phil) {}

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

  private reportError(err: Error, processor: IDirectMessageProcessor) {
    console.error(err);

    DiscordPromises.sendEmbedMessage(
      this.phil.bot,
      GlobalConfig.botManagerUserId,
      {
        color: EmbedColor.Error,
        description: util.inspect(err),
        footer: {
          text: 'processor: ' + processor.handle,
        },
        title: ':no_entry: Processor Error',
      }
    );
  }
}
