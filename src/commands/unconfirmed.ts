import Bucket from '../buckets';
import Features from '../features/all-features';
import { HelpGroup } from '../help-groups';
import PublicMessage from '../messages/public';
import Phil from '../phil';
import { DiscordPromises } from '../promises/discord';
import Prompt from '../prompts/prompt';
import ServerConfig from '../server-config';
import ICommand from './@types';

const MAX_LIST_LENGTH = 10;

export default class UnconfirmedCommand implements ICommand {
    public readonly name = 'unconfirmed';
    public readonly aliases: ReadonlyArray<string> = [];
    public readonly feature = Features.Prompts;

    public readonly helpGroup = HelpGroup.Prompts;
    public readonly helpDescription = 'Creates a list of some of the unconfirmed prompts that are awaiting admin approval before being added to the prompt queue.';

    public readonly versionAdded = 1;

    public readonly isAdminCommand = true;
    public async processMessage(phil: Phil, message: PublicMessage, commandArgs: ReadonlyArray<string>): Promise<any> {
        await phil.db.query('DELETE FROM prompt_confirmation_queue WHERE channel_id = $1', [message.channelId]);
        const bucket = await Bucket.retrieveFromCommandArgs(phil, commandArgs, message.serverConfig, 'unconfirmed', false);

        const prompts = await Prompt.getUnconfirmedPrompts(phil, bucket, MAX_LIST_LENGTH);
        if (prompts.length === 0) {
            return this.outputNoUnconfirmedPrompts(phil, message.channelId);
        }

        for (let index = 0; index < prompts.length; ++index) {
            const prompt = prompts[index];
            await phil.db.query('INSERT INTO prompt_confirmation_queue VALUES($1, $2, $3)', [message.channelId, prompt.promptId, index]);
        }

        return this.outputList(phil, message.serverConfig, message.channelId, prompts);
    }

    private outputNoUnconfirmedPrompts(phil: Phil, channelId: string): Promise<string> {
        return DiscordPromises.sendMessage(phil.bot, channelId, ':large_blue_diamond: There are no unconfirmed prompts in the queue right now.');
    }

    private outputList(phil: Phil, serverConfig: ServerConfig, channelId: string, prompts: Prompt[]): Promise<string> {
        const existenceVerb = (prompts.length === 1 ? 'is' : 'are');
        const noun = (prompts.length === 1 ? 'prompt' : 'prompts');
        let message = ':pencil: Here ' + existenceVerb + ' ' + prompts.length + ' unconfirmed ' + noun + '.';

        for (let index = 0; index < prompts.length; ++index) {
            message += '\n        `' + (index + 1) + '`: "' + prompts[index].text + '"';
        }

        message += '\nConfirm prompts with `' + serverConfig.commandPrefix + 'confirm`. You can specify a single prompt by using its number (`';
        message += serverConfig.commandPrefix + 'confirm 3`) or a range of prompts using a hyphen (`' + serverConfig.commandPrefix + 'confirm 2-7`)';

        return DiscordPromises.sendMessage(phil.bot, channelId, message);
    }
}
