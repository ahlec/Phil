'use strict';

import { Command, ICommandLookup } from './@types';
import { HelpGroup, getHeaderForGroup } from '../phil/help-groups';
import { Client as DiscordIOClient } from 'discord.io';
import { DiscordMessage } from '../phil/discord-message';
import { Database } from '../phil/database';
import { DiscordPromises } from '../promises/discord';
import { Feature } from '../phil/features';

export class KuzcoCommand implements Command {
    readonly name = 'kuzco';
    readonly aliases = [ 'poison' ];
    readonly feature : Feature = null;

    readonly helpGroup = HelpGroup.Memes;
    readonly helpDescription = 'Oh right, the poison.';

    readonly versionAdded = 8;

    readonly publicRequiresAdmin = false;
    async processPublicMessage(bot : DiscordIOClient, message : DiscordMessage, commandArgs : string[], db : Database ) : Promise<any> {
        const poison = this.getPoison(commandArgs);
        const reply = this.createReply(poison);

        await DiscordPromises.deleteMessage(bot, message.channelId, message.id);
        return DiscordPromises.sendMessage(bot, message.channelId, reply);
    }

    private getPoison(commandArgs : string[]) : string[] {
        if (commandArgs.length === 0) {
            return ['kuzco', 'poison'];
        }

        if (commandArgs.length === 1) {
            return [commandArgs[0], 'poison'];
        }

        var indexOfSecondArgument = Math.ceil(commandArgs.length / 2);
        return [
            commandArgs.slice(0, indexOfSecondArgument).join(' ').trim(),
            commandArgs.slice(indexOfSecondArgument).join(' ').trim()
        ];
    }

    private createReply(kuzcosPoison : string[]) : string {
        return 'Oh right, the ' +
            kuzcosPoison[1] +
            '. The ' +
            kuzcosPoison[1] +
            ' for ' +
            kuzcosPoison[0] +
            '. The ' +
            kuzcosPoison[1] +
            ' chosen specially for ' +
            kuzcosPoison[0] +
            '. ' +
            kuzcosPoison[0] +
            '\'s ' +
            kuzcosPoison[1] +
            '.';
    }
};
