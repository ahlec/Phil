import Feature from '../features/feature';
import { HelpGroup } from '../help-groups';
import PublicMessage from '../messages/public';
import PermissionLevel from '../permission-level';
import Phil from '../phil';
import { DiscordPromises } from '../promises/discord';
import ICommand from './@types';

const util = require('util');

const NEWLINE = '\n';
const NOWRAP = '';

export default class EvalCommand implements ICommand {
    public readonly name = 'eval';
    public readonly aliases: ReadonlyArray<string> = [];
    public readonly feature: Feature = null;
    public readonly permissionLevel = PermissionLevel.BotManagerOnly;

    public readonly helpGroup = HelpGroup.General;
    public readonly helpDescription = `Evaluates the result of a JavaScript function with context ${
        NOWRAP}of Phil.`;

    public readonly versionAdded = 13;

    public processMessage(phil: Phil, message: PublicMessage, commandArgs: ReadonlyArray<string>): Promise<any> {
        const javascript = commandArgs.join(' ');
        const result = this.evaluateJavascript(phil, javascript);

        return DiscordPromises.sendEmbedMessage(phil.bot, message.channelId, {
            color: 0x61B329,
            description: `**Evaluated:**${
                NEWLINE}${javascript}${
                NEWLINE}${
                NEWLINE}**Result:**${
                NEWLINE}${result}`,
            title: 'JavaScript evaluation'
        });
    }

    private evaluateJavascript(phil: Phil, javascript: string): any {
        /* tslint:disable:no-eval only-arrow-functions */
        const evalFunc = function() { return eval(javascript); }
        /* tslint:enable:no-eval only-arrow-functions */

        console.log('----------------------------------------');
        console.log('p!eval');
        console.log();
        console.log(javascript);
        const result = evalFunc.call(phil);
        console.log(`result: ${result}`);
        console.log(util.inspect(result));
        console.log('----------------------------------------');

        return result;
    }
};
