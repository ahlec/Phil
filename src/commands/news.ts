'use strict';

import { Command } from './@types';
import { HelpGroup } from '../phil/help-groups';
import { Client as DiscordIOClient } from 'discord.io';
import { DiscordMessage } from '../phil/discord-message';
import { Database } from '../phil/database';
import { BotUtils } from '../phil/utils';
import { Feature } from '../phil/features';
import { DiscordPromises } from '../promises/discord';

export class NewsCommand implements Command {
    readonly name = 'news';
    readonly aliases : string[] = [];
    readonly feature : Feature = null;

    readonly helpGroup = HelpGroup.Admin;
    readonly helpDescription = 'Has Phil echo the message provided in the news channel.';

    readonly versionAdded = 11;

    readonly publicRequiresAdmin = true;
    async processPublicMessage(bot : DiscordIOClient, message : DiscordMessage, commandArgs : string[], db : Database) : Promise<any> {
        const echoedMessage = this.getEchoedStatementFromCommandArgs(commandArgs);
        DiscordPromises.sendMessage(bot, process.env.NEWS_CHANNEL_ID, echoedMessage);
    }

    private getEchoedStatementFromCommandArgs(commandArgs : string[]) {
        var echoedMessage = commandArgs.join(' ').trim();
        echoedMessage = echoedMessage.replace(/`/g, '');

        if (echoedMessage.length === 0) {
            throw new Error('You must provide a message to this function that you would like Phil to repeat in #news. For instance, `' + process.env.COMMAND_PREFIX + 'news A New Guardian has been Chosen!`');
        }

        return echoedMessage;
    }
};
