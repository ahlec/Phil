'use strict';

const assert = require('assert');

import { Client as DiscordIOClient, Server as DiscordIOServer, User as DiscordIOUser } from 'discord.io';
import { OfficialDiscordMessage, OfficialDiscordPayload } from 'official-discord';

function getServer(bot : DiscordIOClient, channelId : string) : DiscordIOServer {
    if (!bot.channels[channelId]) {
        return null;
    }

    const serverId = bot.channels[channelId].guild_id;
    if (!bot.servers[serverId]) {
        return null;
    }

    return bot.servers[serverId];
}

export class DiscordMessageMention {
    constructor(public userId : string, public user : string, public userDiscriminator : string) {
    }
};

export class DiscordMessage {
    public readonly id : string;
    public readonly channelId : string;
    public readonly user : DiscordIOUser;
    public readonly userId : string;
    public readonly content : string;
    public readonly isDirectMessage : boolean;
    public readonly mentions : DiscordMessageMention[];
    public readonly server : DiscordIOServer;

    constructor(event : OfficialDiscordPayload<OfficialDiscordMessage>, bot : DiscordIOClient) {
        this.mentions = [];
        for (let mention of event.d.mentions) {
            this.mentions.push({
                userId: mention.id,
                user: mention.username,
                userDiscriminator: mention.discriminator // ie, #3787
            });
        }

        this.id = event.d.id;
        this.channelId = event.d.channel_id;
        this.userId = event.d.author.id;
        this.user = bot.users[this.userId];
        this.content = event.d.content;
        this.isDirectMessage = (event.d.channel_id in bot.directMessages);
        this.server = getServer(bot, event.d.channel_id);
    }
};
