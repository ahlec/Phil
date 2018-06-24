import { IPublicMessage } from 'phil';
import Bucket from '../phil/buckets';
import Features from '../phil/features/all-features';
import { HelpGroup } from '../phil/help-groups';
import Phil from '../phil/phil';
import { BotUtils } from '../phil/utils';
import { DiscordPromises } from '../promises/discord';
import ICommand from './@types';

export default class PauseCommand implements ICommand {
    public readonly name = 'pause';
    public readonly aliases: ReadonlyArray<string> = [];
    public readonly feature = Features.Prompts;

    public readonly helpGroup = HelpGroup.Prompts;
    public readonly helpDescription = 'Pauses a prompt bucket from posting any new prompts.';

    public readonly versionAdded = 11;

    public readonly isAdminCommand = true;
    public async processMessage(phil: Phil, message: IPublicMessage, commandArgs: ReadonlyArray<string>): Promise<any> {
        const bucket = await Bucket.retrieveFromCommandArgs(phil, commandArgs, message.serverConfig, 'bucket', true);
        await bucket.setIsPaused(phil.db, true);

        const reply = '**' + bucket.displayName + '** (' + bucket.handle + ') has been paused. You can resume it by using `' + message.serverConfig.commandPrefix + 'unpause ' + bucket.handle + '`.';
        DiscordPromises.sendMessage(phil.bot, message.channelId, reply);
    }
};
