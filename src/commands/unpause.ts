import Bucket from 'buckets';
import Features from 'features/all-features';
import { HelpGroup } from 'help-groups';
import PublicMessage from 'messages/public';
import Phil from 'phil';
import { DiscordPromises } from 'promises/discord';
import ICommand from './@types';

export default class UnpauseCommand implements ICommand {
    public readonly name = 'unpause';
    public readonly aliases = ['resume'];
    public readonly feature = Features.Prompts;

    public readonly helpGroup = HelpGroup.Prompts;
    public readonly helpDescription = 'Unpauses a prompt bucket that had been paused earlier from posting any new prompts.';

    public readonly versionAdded = 11;

    public readonly isAdminCommand = true;
    public async processMessage(phil: Phil, message: PublicMessage, commandArgs: ReadonlyArray<string>): Promise<any> {
        const bucket = await Bucket.retrieveFromCommandArgs(phil, commandArgs, message.serverConfig, 'bucket', true);
        await bucket.setIsPaused(phil.db, false);

        const reply = '**' + bucket.displayName + '** (' + bucket.handle + ') has been unpaused. You can pause it once more by using `' + message.serverConfig.commandPrefix + 'pause ' + bucket.handle + '`.';
        DiscordPromises.sendMessage(phil.bot, message.channelId, reply);
    }
};
