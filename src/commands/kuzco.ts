'use strict';

import { Command, ICommandLookup } from './@types';
import { Phil } from '../phil/phil';
import { HelpGroup } from '../phil/help-groups';
import { IPublicMessage } from 'phil';
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
    async processPublicMessage(phil : Phil, message : IPublicMessage, commandArgs : string[]) : Promise<any> {
        const poison = this.getPoison(commandArgs);
        const reply = this.createReply(poison);

        await DiscordPromises.deleteMessage(phil.bot, message.channelId, message.id);
        return DiscordPromises.sendMessage(phil.bot, message.channelId, reply);
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
