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
        const queue = await PromptQueue.getPromptQueue(bot, db, bucket, 1, MAX_QUEUE_DISPLAY_LENGTH);

        const queueMessageId = await DiscordPromises.sendEmbedMessage(bot, message.channelId, {
            color: 0xB0E0E6,
            title: "Prompt Queue for " + bucket.displayName,
            description: this.makeBodyFromQueue(queue),
            footer: this.makeFooterFromQueue(queue)
        });

        if (queue.hasMultiplePages) {
            if (queue.pageNumber > 1) {
                await DiscordPromises.addReaction(bot, message.channelId, queueMessageId, '◀');
            }

            if (queue.pageNumber < queue.totalPages) {
                await DiscordPromises.addReaction(bot, message.channelId, queueMessageId, '▶');
            }
        }
    }

    private makeBodyFromQueue(queue : PromptQueue) : string {
        if (queue.entries.length === 0) {
            return 'There are no prompts in the queue right now.';
        }

        var message = ':calendar_spiral: The queue currently contains **';
        if (queue.count === 1) {
            message += '1 prompt';
        } else {
            message += queue.count + ' prompts';
        }

        message += '**.\n\n';

        for (let entry of queue.entries) {
            message += '**' + (entry.position) + '.** ' + entry.prompt.text + '\n';
        }

        return message;
    }

    private makeFooterFromQueue(queue : PromptQueue) : any {
        if (!queue.hasMultiplePages) {
            return;
        }

        var message = 'Viewing page ' + queue.pageNumber + ' / ' + queue.totalPages + '. Navigate using the arrows below.';
        return {
            text: message
        };
    }
};
