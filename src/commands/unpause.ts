'use strict';

import { Command } from './@types';
import { HelpGroup } from '../phil/help-groups';
import { Client as DiscordIOClient } from 'discord.io';
import { DiscordMessage } from '../phil/discord-message';
import { Database } from '../phil/database';
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
    async processPublicMessage(bot : DiscordIOClient, message : DiscordMessage, commandArgs : string[], db : Database) : Promise<any> {
        const bucket = await Bucket.retrieveFromCommandArgs(bot, db, commandArgs, message.server, 'bucket', true);
        await bucket.setIsPaused(db, false);

        const reply = '**' + bucket.displayName + '** (' + bucket.handle + ') has been unpaused. You can pause it once more by using `' + process.env.COMMAND_PREFIX + 'pause ' + bucket.handle + '`.';
        DiscordPromises.sendMessage(bot, message.channelId, reply);
    }
};
