'use strict';

import { Client } from 'discord.io';
import { Database } from './database';
import { OfficialDiscordReactionEvent } from 'official-discord';
import { Reactable } from './reactables/reactable';
import { BotUtils } from './utils';

export class ReactionProcessor {
    private readonly _bot : Client;
    private readonly _db : Database;

    constructor(bot : Client, db : Database) {
        this._bot = bot;
        this._db = db;
    }

    async processReactionAdded(data : OfficialDiscordReactionEvent) : Promise<void> {
        if (!this.shouldProcessEvent(data)) {
            return;
        }

        const reactable = await Reactable.getFromMessageId(this._bot, this._db, data.message_id);
        if (!reactable) {
            return;
        }

        console.log('reacting to a reactable');
    }

    private shouldProcessEvent(data : OfficialDiscordReactionEvent) : boolean {
        const user = this._bot.users[data.user_id];
        if (!user) {
            return false;
        }

        return !user.bot;
    }
};
