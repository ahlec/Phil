import EmbedColor from '../embed-color';
import { sendEmbedMessage } from '../promises/discord';
import {
  BotManagerCommand,
  LoggerDefinition,
  Phil,
  PrivateMessage,
} from './BotManagerCommand';

export default class InviteCommand extends BotManagerCommand {
  public constructor(parentDefinition: LoggerDefinition) {
    super('invite', parentDefinition);
  }

  public async execute(phil: Phil, message: PrivateMessage): Promise<any> {
    await sendEmbedMessage(phil.bot, message.userId, {
      color: EmbedColor.Info,
      description: phil.bot.inviteURL,
      title: ':gift: My Invite Link',
    });
  }
}
