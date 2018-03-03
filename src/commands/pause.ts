'use strict';

import { Command } from './@types';
import { HelpGroup } from '../phil/help-groups';
import { Client as DiscordIOClient } from 'discord.io';
import { DiscordMessage } from '../phil/discord-message';
import { Database } from '../phil/database';
import { BotUtils } from '../phil/utils';
import { instance as DiscordPromises } from '../promises/discord';
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
    async processPublicMessage(bot : DiscordIOClient, message : DiscordMessage, commandArgs : string[], db : Database) : Promise<any> {
        const bucket = await Bucket.retrieveFromCommandArgs(bot, db, commandArgs, message.server, 'bucket', true);
        await bucket.setIsPaused(db, true);

        const reply = '**' + bucket.displayName + '** (' + bucket.handle + ') has been paused. You can resume it by using `' + process.env.COMMAND_PREFIX + 'unpause ' + bucket.handle + '`.';
        DiscordPromises.sendMessage(bot, message.channelId, reply);
    }
};
