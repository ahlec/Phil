'use strict';

import { Command } from './@types';
import { Phil } from '../phil/phil';
import { HelpGroup } from '../phil/help-groups';
import { DiscordMessage } from '../phil/discord-message';
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
    async processPublicMessage(phil : Phil, message : DiscordMessage, commandArgs : string[]) : Promise<any> {
        const bucket = await Bucket.retrieveFromCommandArgs(phil, commandArgs, message.serverConfig, 'queue', false);
        const queue = await PromptQueue.getPromptQueue(phil.bot, phil.db, bucket, 1, MAX_QUEUE_DISPLAY_LENGTH);

        await queue.postToChannel(phil.bot, phil.db, message);
    }
};
