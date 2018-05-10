'use strict';

import { Chrono } from './@types';
import { Phil } from '../phil/phil';
import { DiscordPromises } from '../promises/discord';
import { ServerConfig } from '../phil/server-config';
import { Bucket } from '../phil/buckets';
import { PromptQueue } from '../phil/prompts/queue';

const PROMPT_QUEUE_EMPTY_ALERT_THRESHOLD = 5;

export class AlertLowBucketQueueChrono implements Chrono {
    readonly handle = 'alert-low-bucket-queue';

    async process(phil : Phil, serverConfig : ServerConfig, now : Date) {
        const serverBuckets = await Bucket.getAllForServer(phil.bot, phil.db, serverConfig.server.id);

        for (let bucket of serverBuckets) {
            if (!bucket.isValid || bucket.isPaused || !bucket.alertWhenLow) {
                continue;
            }

            let queueLength = await PromptQueue.getTotalLength(phil.db, bucket);
            if (queueLength > PROMPT_QUEUE_EMPTY_ALERT_THRESHOLD) {
                continue;
            }

            this.alertQueueDwindling(phil, serverConfig, bucket, queueLength);
        }
    }

    private alertQueueDwindling(phil : Phil, serverConfig : ServerConfig, bucket : Bucket, queueLength : number) {
        var are = (queueLength === 1 ? 'is' : 'are');
        var promptNoun = (queueLength === 1 ? 'prompt' : 'prompts');

        var message = ':warning: The queue for **' + bucket.displayName + '** (`' + bucket.handle + '`) is growing short. There ' + are + ' **' + (queueLength > 0 ? queueLength : 'no') + '** more ' + promptNoun + ' in the queue.';
        DiscordPromises.sendMessage(phil.bot, serverConfig.botControlChannel.id, message);
    }
}
