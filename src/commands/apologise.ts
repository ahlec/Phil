'use strict';

import { Command } from './@types';
import { HelpGroup } from '../phil/help-groups';
import { Client as DiscordIOClient } from 'discord.io';
import { DiscordMessage } from '../phil/discord-message';
import { Database } from '../phil/database';

const botUtils = require('../phil/utils');
const discord = require('../promises/discord');

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
    public readonly name = 'apologise';
    public readonly aliases = ['apologize'];

    public readonly helpGroup = HelpGroup.None;
    public readonly helpDescription = 'Makes Phil apologise for making a mistake.';

    public readonly versionAdded = 3;

    public readonly publicRequiresAdmin = false;
    public processPublicMessage(bot : DiscordIOClient, message : DiscordMessage, commandArgs : string[], db : Database) : Promise<any> {
        const apology = botUtils.getRandomArrayEntry(apologies);
        return discord.sendMessage(bot, message.channelId, apology);
    }
};
