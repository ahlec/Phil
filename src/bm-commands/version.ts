import { sendMessage } from '@phil/promises/discord';
import { CODE_VERSION, DATABASE_VERSION } from '@phil/versions';
import {
  BotManagerCommand,
  LoggerDefinition,
  Phil,
  PrivateMessage,
} from './BotManagerCommand';

export default class VersionBotManagerCommand extends BotManagerCommand {
  public constructor(parentDefinition: LoggerDefinition) {
    super('version', parentDefinition);
  }

  public async execute(phil: Phil, message: PrivateMessage): Promise<void> {
    await sendMessage(
      phil.bot,
      message.channelId,
      `**Code**: v${CODE_VERSION.displayString}\n**Database**: v${DATABASE_VERSION}`
    );
  }
}
