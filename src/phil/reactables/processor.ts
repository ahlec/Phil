'use strict';

import { Client } from 'discord.io';
import { Database } from '../database';
import { OfficialDiscordReactionEvent } from 'official-discord';
import { ReactablePost } from './post';
import { ReactableTypeRegistry } from './types/@registry';
import { BotUtils } from '../utils';

export class ReactableProcessor {
    private readonly _bot : Client;
    private readonly _db : Database;

    constructor(bot : Client, db : Database) {
        this._bot = bot;
        this._db = db;
    }

    async processReactionAdded(event : OfficialDiscordReactionEvent) : Promise<void> {
        if (!this.shouldProcessEvent(event)) {
            return;
        }

        const post = await ReactablePost.getFromMessageId(this._bot, this._db, event.message_id);
        if (!post) {
            return;
        }

        const reactableType = ReactableTypeRegistry[post.reactableHandle];
        if (!reactableType) {
            throw new Error('Attempted to react to an undefined reactable: `' + post.reactableHandle + '`');
        }

        reactableType.processReactionAdded(this._bot, this._db, post, event);
    }

    private shouldProcessEvent(event : OfficialDiscordReactionEvent) : boolean {
        const user = this._bot.users[event.user_id];
        if (!user) {
            return false;
        }

        return !user.bot;
    }
};
