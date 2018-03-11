'use strict';

import { Chrono } from './@types';
import { Client as DiscordIOClient, Server as DiscordIOServer } from 'discord.io';
import { Database } from '../phil/database';
import { DiscordPromises } from '../promises/discord';

export class BootyDayChrono implements Chrono {
    readonly handle = 'booty-day';

    async process(bot : DiscordIOClient, db : Database, server : DiscordIOServer, now : Date) {
        if (now.getUTCDate() !== 3) {
            console.log('Today isn\'t booty day.');
            return;
        }

        DiscordPromises.sendMessage(bot, process.env.NEWS_CHANNEL_ID, process.env.CUSTOM_EMOJI_PEEK + ' It\'s booty day! Post your Hijack booties!');
    }
}
