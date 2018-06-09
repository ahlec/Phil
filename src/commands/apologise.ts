'use strict';

import { Command } from './@types';
import { Phil } from '../phil/phil';
import { HelpGroup } from '../phil/help-groups';
import { IPublicMessage } from 'phil';
import { BotUtils } from '../phil/utils';
import { DiscordPromises } from '../promises/discord';
import { Feature } from '../phil/features';

const apologies = [
    'I am incredibly sorry for my mistake.',
    'Es tut mir aber leid, dass ich ein schlechte Yeti war.',
    'We all make mistakes, and I made a horrible one. I\'m sincerely sorry.',
    'I apologise for my behaviour, it was unacceptable and I will never do it again.',
    'I\'m sorry.',
    'I\'m really sorry.',
    'I hope you can forgive me for what I\'ve done.',
    'I will do my best to learn from this mistake that I\'ve made.',
    'On my Yeti honour and pride, I shall never do this again.'
];

export class ApologiseCommand implements Command {
    readonly name = 'apologise';
    readonly aliases = ['apologize'];
    readonly feature : Feature = null;

    readonly helpGroup = HelpGroup.None;
    readonly helpDescription = 'Makes Phil apologise for making a mistake.';

    readonly versionAdded = 3;

    readonly isAdminCommand = false;
    async processMessage(phil : Phil, message : IPublicMessage, commandArgs : string[]) : Promise<any> {
        const apology = BotUtils.getRandomArrayEntry(apologies);
        return DiscordPromises.sendMessage(phil.bot, message.channelId, apology);
    }
};
