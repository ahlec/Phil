'use strict';

import { Client } from 'discord.io';
import { Database } from '../database';
import { OfficialDiscordReactionEvent } from 'official-discord';
import { ReactablePost } from './post';
import { ReactableTypeRegistry } from './@registry';
import { BotUtils } from '../utils';

export class ReactableProcessor {
    constructor(private readonly bot : Client, private readonly db : Database) {
    }

    async processReactionAdded(event : OfficialDiscordReactionEvent) : Promise<void> {
        if (!this.shouldProcessEvent(event)) {
            return;
        }

        const post = await ReactablePost.getFromMessageId(this.bot, this.db, event.message_id);
        if (!post) {
            return;
        }

        const reactableType = ReactableTypeRegistry[post.reactableHandle];
        if (!reactableType) {
            throw new Error('Attempted to react to an undefined reactable: `' + post.reactableHandle + '`');
        }

        reactableType.processReactionAdded(this.bot, this.db, post, event);
    }

    private shouldProcessEvent(event : OfficialDiscordReactionEvent) : boolean {
        const user = this.bot.users[event.user_id];
        if (!user) {
            return false;
        }

        return !user.bot;
    }
};
