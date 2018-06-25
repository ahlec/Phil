import Bucket from 'buckets';
import Features from 'features/all-features';
import { HelpGroup } from 'help-groups';
import PublicMessage from 'messages/public';
import Phil from 'phil';
import { PromptQueue } from 'prompts/queue';
import ICommand from './@types';

const MAX_QUEUE_DISPLAY_LENGTH = 10;

export default class QueueCommand implements ICommand {
    public readonly name = 'queue';
    public readonly aliases: ReadonlyArray<string> = [];
    public readonly feature = Features.Prompts;

    public readonly helpGroup = HelpGroup.Prompts;
    public readonly helpDescription = 'Displays the current queue of approved prompts that will show up in chat shortly.';

    public readonly versionAdded = 7;

    public readonly isAdminCommand = true;
    public async processMessage(phil: Phil, message: PublicMessage, commandArgs: ReadonlyArray<string>): Promise<any> {
        const bucket = await Bucket.retrieveFromCommandArgs(phil, commandArgs, message.serverConfig, 'queue', false);
        const queue = await PromptQueue.getPromptQueue(phil.bot, phil.db, bucket, 1, MAX_QUEUE_DISPLAY_LENGTH);

        await queue.postToChannel(phil.bot, phil.db, message);
    }
};
