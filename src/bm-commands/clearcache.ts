import {
  BotManagerCommand,
  LoggerDefinition,
  Phil,
  ReceivedDirectMessage,
} from './BotManagerCommand';

export default class ClearCacheBotManagerCommand extends BotManagerCommand {
  public constructor(parentDefinition: LoggerDefinition) {
    super('clearcache', parentDefinition);
  }

  public async execute(
    phil: Phil,
    message: ReceivedDirectMessage
  ): Promise<void> {
    phil.serverDirectory.clearCache();
    await message.respond({
      text: 'Caches have been cleared.',
      type: 'success',
    });
  }
}
