'use strict';

import { Chrono } from './@types';
import { Client as DiscordIOClient, Server as DiscordIOServer } from 'discord.io';
import { Database } from '../phil/database';
import { DiscordPromises } from '../promises/discord';
import { ServerConfig } from '../phil/server-configs';
import { Bucket } from '../phil/buckets';
import { Prompt } from '../phil/prompts/prompt';
import { PromptQueue } from '../phil/prompts/queue'

export class PostNewPromptsChrono implements Chrono {
    readonly handle = 'post-new-prompts';

    async process(bot : DiscordIOClient, db : Database, server : DiscordIOServer, now : Date) {
        const serverConfig = await ServerConfig.getFromId(db, server);
        const serverBuckets = await Bucket.getAllForServer(bot, db, server.id);

        for (let bucket of serverBuckets) {
            if (bucket.isPaused || !bucket.isValid) {
                continue;
            }

            await this.processBucket(bot, db, serverConfig, now, bucket);
        }
    }

    private async processBucket(bot : DiscordIOClient, db : Database, serverConfig : ServerConfig, now : Date, bucket : Bucket) {
        const currentPrompt = await Prompt.getCurrentPrompt(bot, db, bucket);
        if (!this.isCurrentPromptOutdated(currentPrompt, now, bucket)) {
            console.log('[CHRONOS]    - bucket %s on server %s is not ready for a new prompt just yet', bucket.handle, serverConfig.serverId);
            return;
        }

        const promptQueue = await PromptQueue.getPromptQueue(bot, db, bucket, 1, 1);
        if (promptQueue.count === 0) {
            return;
        }

        const prompt = promptQueue.entries[0].prompt;
        await prompt.postAsNewPrompt(bot, db, now);
    }

    private isCurrentPromptOutdated(currentPrompt : Prompt, now : Date, bucket : Bucket) {
        if (!currentPrompt || !currentPrompt.datePosted) {
            return true;
        }

        return bucket.isFrequencyMet(currentPrompt.datePosted, now);
    }
}
