'use strict';

import { Chrono } from './@types';
import { Client as DiscordIOClient, Server as DiscordIOServer } from 'discord.io';
import { Database } from '../phil/database';
import { DiscordPromises } from '../promises/discord';
import { ServerConfig } from '../phil/server-configs';
import { Bucket } from '../phil/buckets';
import { PromptQueue } from '../phil/prompts';

const PROMPT_QUEUE_EMPTY_ALERT_THRESHOLD = 5;

export class AlertLowBucketQueueChrono implements Chrono {
    readonly handle = 'alert-low-bucket-queue';

    async process(bot : DiscordIOClient, db : Database, server : DiscordIOServer, now : Date) {
        const serverConfig = await ServerConfig.getFromId(db, server);
        const serverBuckets = await Bucket.getAllForServer(bot, db, server.id);

        for (let bucket of serverBuckets) {
            if (!bucket.isValid || bucket.isPaused || !bucket.alertWhenLow) {
                continue;
            }

            let queueLength = await PromptQueue.getTotalLength(db, bucket);
            if (queueLength > PROMPT_QUEUE_EMPTY_ALERT_THRESHOLD) {
                continue;
            }

            this.alertQueueDwindling(bot, serverConfig, bucket, queueLength);
        }
    }

    private alertQueueDwindling(bot : DiscordIOClient, serverConfig : ServerConfig, bucket : Bucket, queueLength : number) {
        var are = (queueLength === 1 ? 'is' : 'are');
        var promptNoun = (queueLength === 1 ? 'prompt' : 'prompts');

        var message = ':warning: The queue for **' + bucket.displayName + '** (`' + bucket.handle + '`) is growing short. There ' + are + ' **' + (queueLength > 0 ? queueLength : 'no') + '** more ' + promptNoun + ' in the queue.';
        DiscordPromises.sendMessage(bot, serverConfig.botControlChannel.id, message);
    }
}
