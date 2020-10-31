import { CODE_VERSION, DATABASE_VERSION } from '@phil/versions';
import {
  BotManagerCommand,
  LoggerDefinition,
  Phil,
  ReceivedDirectMessage,
} from './BotManagerCommand';

export default class VersionBotManagerCommand extends BotManagerCommand {
  public constructor(parentDefinition: LoggerDefinition) {
    super('version', parentDefinition);
  }

  public async execute(
    phil: Phil,
    message: ReceivedDirectMessage
  ): Promise<void> {
    await message.respond({
      type: 'plain',
      text: `**Code**: v${CODE_VERSION.displayString}\n**Database**: v${DATABASE_VERSION}`,
    });
  }
}
