'use strict';

import { Command } from './@types';
import { HelpGroup } from '../phil/help-groups';
import { Client as DiscordIOClient } from 'discord.io';
import { DiscordMessage } from '../phil/discord-message';
import { Database } from '../phil/database';
import { BotUtils } from '../phil/utils';
import { DiscordPromises } from '../promises/discord';
import { Feature } from '../phil/features';

const conchReplies = [
    'Maybe someday',
    'Nothing',
    'Neither',
    'Follow the seahorse',
    'I don\'t think so',
    'No',
    'No',
    'No',
    'Yes',
    'Try asking again',
    'Try asking again'
];

export class ConchCommand implements Command {
    readonly name = 'conch';
    readonly aliases = ['magicconch', 'mc'];
    readonly feature : Feature = null;

    readonly helpGroup = HelpGroup.Memes;
    readonly helpDescription = 'The Magic Conch says...';

    readonly versionAdded = 3;

    readonly publicRequiresAdmin = false;
    async processPublicMessage(bot : DiscordIOClient, message : DiscordMessage, commandArgs : string[], db : Database) : Promise<any> {
        const conchReply = BotUtils.getRandomArrayEntry(conchReplies);
        const reply = ':shell: The Magic Conch Shell says: **' + conchReply + '**.';

        return DiscordPromises.sendMessage(bot, message.channelId, reply);
    }
};
