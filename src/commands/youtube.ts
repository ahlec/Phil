'use strict';

import { Command } from './@types';
import { Phil } from '../phil/phil';
import { HelpGroup } from '../phil/help-groups';
import { DiscordMessage } from '../phil/discord-message';
import { DiscordPromises } from '../promises/discord';
import { Feature } from '../phil/features';
import { YouTubePromises } from '../promises/youtube';

export class YoutubeCommand implements Command {
    readonly name = 'youtube';
    readonly aliases = [ 'yt' ];
    readonly feature : Feature = null;

    readonly helpGroup = HelpGroup.General;
    readonly helpDescription = 'Searches YouTube for something and posts a link to the first video.';

    readonly versionAdded = 4;

    readonly publicRequiresAdmin = false;
    async processPublicMessage(phil : Phil, message : DiscordMessage, commandArgs : string[]) : Promise<any> {
        const query = commandArgs.join(' ').trim();
        if (query.length === 0) {
            throw new Error('You must provide some text to tell me what to search for.');
        }

        const results = await YouTubePromises.search(query);
        if (results.length === 0 || !results[0].id) {
            throw new Error('There were no results on YouTube for you search.');
        }

        const link = 'https://youtu.be/' + results[0].id;
        DiscordPromises.sendMessage(phil.bot, message.channelId, link);
    }
};
