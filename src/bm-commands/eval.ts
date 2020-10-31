import { inspect } from 'util';
import {
  BotManagerCommand,
  LoggerDefinition,
  Phil,
  ReceivedDirectMessage,
} from './BotManagerCommand';

export default class EvalBotManagerCommand extends BotManagerCommand {
  public constructor(parentDefinition: LoggerDefinition) {
    super('eval', parentDefinition);
  }

  public async execute(
    phil: Phil,
    message: ReceivedDirectMessage,
    args: string
  ): Promise<void> {
    const javascript = args;
    const result = this.evaluateJavascript(phil, javascript);
    await message.respond({
      color: 'green',
      description: `**Evaluated:**\n${javascript}\n\n**Result:**\n${result}`,
      fields: null,
      footer: null,
      title: 'JavaScript evaluation',
      type: 'embed',
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
