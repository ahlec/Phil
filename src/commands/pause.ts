'use strict';

import { Command } from './@types';
import { Phil } from '../phil/phil';
import { HelpGroup } from '../phil/help-groups';
import { DiscordMessage } from '../phil/discord-message';
import { BotUtils } from '../phil/utils';
import { DiscordPromises } from '../promises/discord';
import { Features } from '../phil/features';
import { Bucket } from '../phil/buckets';

export class PauseCommand implements Command {
    readonly name = 'pause';
    readonly aliases : string[] = [];
    readonly feature = Features.Prompts;

    readonly helpGroup = HelpGroup.Prompts;
    readonly helpDescription = 'Pauses a prompt bucket from posting any new prompts.';

    readonly versionAdded = 11;

    readonly publicRequiresAdmin = true;
    async processPublicMessage(phil : Phil, message : DiscordMessage, commandArgs : string[]) : Promise<any> {
        const bucket = await Bucket.retrieveFromCommandArgs(phil.bot, phil.db, commandArgs, message.server, 'bucket', true);
        await bucket.setIsPaused(phil.db, true);

        const reply = '**' + bucket.displayName + '** (' + bucket.handle + ') has been paused. You can resume it by using `' + process.env.COMMAND_PREFIX + 'unpause ' + bucket.handle + '`.';
        DiscordPromises.sendMessage(phil.bot, message.channelId, reply);
    }
};
