import { sendSuccessMessage } from '../utils';
import {
  BotManagerCommand,
  LoggerDefinition,
  Phil,
  PrivateMessage,
} from './BotManagerCommand';

export default class ClearCacheBotManagerCommand extends BotManagerCommand {
  public constructor(parentDefinition: LoggerDefinition) {
    super('clearcache', parentDefinition);
  }

  public async execute(phil: Phil, message: PrivateMessage): Promise<void> {
    phil.serverDirectory.clearCache();
    await sendSuccessMessage({
      bot: phil.bot,
      channelId: message.channelId,
      message: 'Caches have been cleared.',
    });
  }
}
