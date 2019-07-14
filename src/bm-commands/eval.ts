import { inspect } from 'util';
import EmbedColor from '../embed-color';
import { DiscordPromises } from '../promises/discord';
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
    DiscordPromises.sendEmbedMessage(phil.bot, message.channelId, {
      color: EmbedColor.Success,
      description: `**Evaluated:**\n${javascript}\n\n**Result:**\n${result}`,
      title: 'JavaScript evaluation',
    });
  }

  private evaluateJavascript(phil: Phil, javascript: string): any {
    /* tslint:disable:no-eval only-arrow-functions */
    const evalFunc = function() {
      return eval(javascript);
    };
    /* tslint:enable:no-eval only-arrow-functions */

    this.write('----------------------------------------');
    this.write('p!eval');
    this.write('');
    this.write(javascript);
    const result = evalFunc.call(phil);
    this.write(`result: ${result}`);
    this.write(inspect(result));
    this.write('----------------------------------------');

    return result;
  }
}
