'use strict';

import { Chrono } from './@types';
import { Phil } from '../phil/phil';
import { ServerConfig } from '../phil/server-config';
import { DiscordPromises } from '../promises/discord';
import { Bucket } from '../phil/buckets';
import { Prompt } from '../phil/prompts/prompt';
import { PromptQueue } from '../phil/prompts/queue'

export class PostNewPromptsChrono implements Chrono {
    readonly handle = 'post-new-prompts';

    async process(phil : Phil, serverConfig : ServerConfig, now : Date) {
        const serverBuckets = await Bucket.getAllForServer(phil.bot, phil.db, serverConfig.server.id);

        for (let bucket of serverBuckets) {
            if (bucket.isPaused || !bucket.isValid) {
                continue;
            }

            await this.processBucket(phil, serverConfig, now, bucket);
        }
    }

    private async processBucket(phil : Phil, serverConfig : ServerConfig, now : Date, bucket : Bucket) {
        const currentPrompt = await Prompt.getCurrentPrompt(phil, bucket);
        if (!this.isCurrentPromptOutdated(currentPrompt, now, bucket)) {
            console.log('[CHRONOS]    - bucket %s on server %s is not ready for a new prompt just yet', bucket.handle, serverConfig.serverId);
            return;
        }

        const promptQueue = await PromptQueue.getPromptQueue(phil.bot, phil.db, bucket, 1, 1);
        if (promptQueue.count === 0) {
            return;
        }

        const prompt = promptQueue.entries[0].prompt;
        await prompt.postAsNewPrompt(phil, serverConfig, now);
    }

    private isCurrentPromptOutdated(currentPrompt : Prompt, now : Date, bucket : Bucket) {
        if (!currentPrompt || !currentPrompt.datePosted) {
            return true;
        }

        return bucket.isFrequencyMet(currentPrompt.datePosted, now);
    }
}
