import Bucket from 'buckets';
import Features from 'features/all-features';
import { HelpGroup } from 'help-groups';
import PublicMessage from 'messages/public';
import Phil from 'phil';
import Prompt from 'prompts/prompt';
import ICommand from './@types';

export default class PromptCommand implements ICommand {
    public readonly name = 'prompt';
    public readonly aliases: ReadonlyArray<string> = [];
    public readonly feature = Features.Prompts;

    public readonly helpGroup = HelpGroup.Prompts;
    public readonly helpDescription = 'Asks Phil to remind you what the prompt of the day is.';

    public readonly versionAdded = 3;

    public readonly isAdminCommand = false;
    public async processMessage(phil: Phil, message: PublicMessage, commandArgs: ReadonlyArray<string>): Promise<any> {
        const bucket = await Bucket.getFromChannelId(phil.bot, phil.db, message.channelId);
        if (!bucket) {
            throw new Error('This channel is not configured to work with prompts.');
        }

        const prompt = await Prompt.getCurrentPrompt(phil, bucket);
        if (!prompt) {
            throw new Error('There\'s no prompt right now. That probably means that I\'m out of them! Why don\'t you suggest more by sending me `' + message.serverConfig.commandPrefix + 'suggest` and including your prompt?');
        }

        prompt.sendToChannel(phil, message.serverConfig, message.channelId, bucket, prompt.promptNumber);
    }
};
