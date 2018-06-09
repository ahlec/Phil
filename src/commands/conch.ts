'use strict';

import { Command } from './@types';
import { Phil } from '../phil/phil';
import { HelpGroup } from '../phil/help-groups';
import { IPublicMessage } from 'phil';
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

    readonly isAdminCommand = false;
    async processMessage(phil : Phil, message : IPublicMessage, commandArgs : string[]) : Promise<any> {
        const conchReply = BotUtils.getRandomArrayEntry(conchReplies);
        const reply = ':shell: The Magic Conch Shell says: **' + conchReply + '**.';

        return DiscordPromises.sendMessage(phil.bot, message.channelId, reply);
    }
};
