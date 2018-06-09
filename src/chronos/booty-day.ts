'use strict';

import { Chrono } from './@types';
import { Phil } from '../phil/phil';
import { ServerConfig } from '../phil/server-config';
import { DiscordPromises } from '../promises/discord';

export class BootyDayChrono implements Chrono {
    readonly handle = 'booty-day';

    async process(phil : Phil, serverConfig : ServerConfig, now : Date) {
        if (now.getUTCDate() !== 3) {
            console.log('Today isn\'t booty day.');
            return;
        }

        DiscordPromises.sendMessage(phil.bot, serverConfig.newsChannel.id, process.env.CUSTOM_EMOJI_PEEK + ' It\'s booty day! Post your Hijack booties!');
    }
}
