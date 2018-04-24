'use strict';

import { Command } from './@types';
import { HelpGroup } from '../phil/help-groups';
import { Client as DiscordIOClient, Server as DiscordIOServer, Role as DiscordIORole } from 'discord.io';
import { DiscordMessage } from '../phil/discord-message';
import { Database } from '../phil/database';
import { Features } from '../phil/features';
import { Bucket } from '../phil/buckets';
import { PromptQueue } from '../phil/prompts/queue';

const MAX_QUEUE_DISPLAY_LENGTH = 10;

export class QueueCommand implements Command {
    readonly name = 'queue';
    readonly aliases : string[] = [];
    readonly feature = Features.Prompts;

    readonly helpGroup = HelpGroup.Prompts;
    readonly helpDescription = 'Displays the current queue of approved prompts that will show up in chat shortly.';

    readonly versionAdded = 7;

    readonly publicRequiresAdmin = true;
    async processPublicMessage(bot : DiscordIOClient, message : DiscordMessage, commandArgs : string[], db : Database) : Promise<any> {
        const bucket = await Bucket.retrieveFromCommandArgs(bot, db, commandArgs, message.server, 'queue', false);
        const queue = await PromptQueue.getPromptQueue(bot, db, bucket, 1, MAX_QUEUE_DISPLAY_LENGTH);

        await queue.postToChannel(bot, db, message);
    }
};
