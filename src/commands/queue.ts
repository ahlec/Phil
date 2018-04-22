'use strict';

import { Command } from './@types';
import { HelpGroup } from '../phil/help-groups';
import { Client as DiscordIOClient, Server as DiscordIOServer, Role as DiscordIORole } from 'discord.io';
import { DiscordMessage } from '../phil/discord-message';
import { Database } from '../phil/database';
import { BotUtils } from '../phil/utils';
import { DiscordPromises } from '../promises/discord';
import { Features } from '../phil/features';
import { Bucket } from '../phil/buckets';
import { PromptQueue } from '../phil/prompts/queue';
import { MessageBuilder } from '../phil/message-builder';

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
        const queue = await PromptQueue.getPromptQueue(bot, db, bucket, MAX_QUEUE_DISPLAY_LENGTH);
        const reply = this.makeMessageOutOfQueue(queue);
        DiscordPromises.sendMessage(bot, message.channelId, reply);
    }

    private makeMessageOutOfQueue(queue : PromptQueue) : string {
        if (queue.entries.length === 0) {
            return ':large_blue_diamond: There are no prompts in the queue right now.';
        }

        var message = ':calendar_spiral: The queue currently contains **';
        if (queue.length === 1) {
            message += '1 prompt';
        } else if (queue.length === MAX_QUEUE_DISPLAY_LENGTH) {
            message += queue.length + ' (or more) prompts';
        } else {
            message += queue.length + ' prompts';
        }
        message += '**. Here\'s what to expect:\n\n';

        for (let index = 0; index < queue.length; ++index) {
            message += (index + 1) + '. ' + queue.entries[index].text + '\n';
        }

        return message;
    }
};
