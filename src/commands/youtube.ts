'use strict';

import { Command } from './@types';
import { HelpGroup } from '../phil/help-groups';
import { Client as DiscordIOClient } from 'discord.io';
import { DiscordMessage } from '../phil/discord-message';
import { Database } from '../phil/database';
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
    async processPublicMessage(bot : DiscordIOClient, message : DiscordMessage, commandArgs : string[], db : Database) : Promise<any> {
        const query = commandArgs.join(' ').trim();
        if (query.length === 0) {
            throw new Error('You must provide some text to tell me what to search for.');
        }

        const results = await YouTubePromises.search(query);
        if (results.items.length === 0 || !results.items[0].id.videoId) {
            throw new Error('There were no results on YouTube for you search.');
        }

        const link = 'https://youtu.be/' + results.items[0].id.videoId;
        DiscordPromises.sendMessage(bot, message.channelId, link);
    }
};
