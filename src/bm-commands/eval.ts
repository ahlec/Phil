import { inspect } from 'util';
import EmbedColor from '../embed-color';
import { sendEmbedMessage } from '../promises/discord';
import {
  BotManagerCommand,
  LoggerDefinition,
  Phil,
  PrivateMessage,
} from './BotManagerCommand';

export default class EvalBotManagerCommand extends BotManagerCommand {
  public constructor(parentDefinition: LoggerDefinition) {
    super('eval', parentDefinition);
  }

  public async execute(
    phil: Phil,
    message: PrivateMessage,
    args: string
  ): Promise<void> {
    const javascript = args;
    const result = this.evaluateJavascript(phil, javascript);
    sendEmbedMessage(phil.bot, message.channelId, {
      color: EmbedColor.Success,
      description: `**Evaluated:**\n${javascript}\n\n**Result:**\n${result}`,
      title: 'JavaScript evaluation',
    });
  }

  private evaluateJavascript(phil: Phil, javascript: string): unknown {
    this.write('----------------------------------------');
    this.write('p!eval');
    this.write('');
    this.write(javascript);
    const result = eval.call(phil, javascript);
    this.write(`result: ${result}`);
    this.write(inspect(result));
    this.write('----------------------------------------');

    return result;
  }
}
