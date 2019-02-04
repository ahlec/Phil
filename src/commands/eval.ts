import { inspect } from 'util';
import EmbedColor from '../embed-color';
import PublicMessage from '../messages/public';
import PermissionLevel from '../permission-level';
import Phil from '../phil';
import { DiscordPromises } from '../promises/discord';
import Command, { LoggerDefinition } from './@types';

const NEWLINE = '\n';

export default class EvalCommand extends Command {
  public constructor(parentDefinition: LoggerDefinition) {
    super('eval', parentDefinition, {
      helpDescription:
        'Evaluates the result of a JavaScript function with context of Phil.',
      permissionLevel: PermissionLevel.BotManagerOnly,
      versionAdded: 13,
    });
  }

  public processMessage(
    phil: Phil,
    message: PublicMessage,
    commandArgs: ReadonlyArray<string>
  ): Promise<any> {
    const javascript = commandArgs.join(' ');
    const result = this.evaluateJavascript(phil, javascript);

    return DiscordPromises.sendEmbedMessage(phil.bot, message.channelId, {
      color: EmbedColor.Success,
      description: `**Evaluated:**${NEWLINE}${javascript}${NEWLINE}${NEWLINE}**Result:**${NEWLINE}${result}`,
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
