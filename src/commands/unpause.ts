'use strict';

import { Command } from './@types';
import { Phil } from '../phil/phil';
import { HelpGroup } from '../phil/help-groups';
import { DiscordMessage } from '../phil/discord-message';
import { BotUtils } from '../phil/utils';
import { DiscordPromises } from '../promises/discord';
import { Features } from '../phil/features';
import { Bucket } from '../phil/buckets';

export class UnpauseCommand implements Command {
    readonly name = 'unpause';
    readonly aliases = ['resume'];
    readonly feature = Features.Prompts;

    readonly helpGroup = HelpGroup.Prompts;
    readonly helpDescription = 'Unpauses a prompt bucket that had been paused earlier from posting any new prompts.';

    readonly versionAdded = 11;

    readonly publicRequiresAdmin = true;
    async processPublicMessage(phil : Phil, message : DiscordMessage, commandArgs : string[]) : Promise<any> {
        const bucket = await Bucket.retrieveFromCommandArgs(phil.bot, phil.db, commandArgs, message.server, 'bucket', true);
        await bucket.setIsPaused(phil.db, false);

        const reply = '**' + bucket.displayName + '** (' + bucket.handle + ') has been unpaused. You can pause it once more by using `' + process.env.COMMAND_PREFIX + 'pause ' + bucket.handle + '`.';
        DiscordPromises.sendMessage(phil.bot, message.channelId, reply);
    }
};
