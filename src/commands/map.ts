'use strict';

import { Command } from './@types';
import { Phil } from '../phil/phil';
import { HelpGroup } from '../phil/help-groups';
import { DiscordMessage } from '../phil/discord-message';
import { DiscordPromises } from '../promises/discord';
import { Features } from '../phil/features';
import { BotUtils } from '../phil/utils';

export class MapCommand implements Command {
    readonly name = 'map';
    readonly aliases : string[] = [];
    readonly feature = Features.FandomMap;

    readonly helpGroup = HelpGroup.General;
    readonly helpDescription = 'Has Phil provide a link to the editable map of the fandom.';

    readonly versionAdded = 8;

    readonly publicRequiresAdmin = false;
    processPublicMessage(phil : Phil, message : DiscordMessage, commandArgs : string[]) : Promise<any> {
        if (!message.serverConfig.fandomMapLink) {
            return BotUtils.sendErrorMessage({
                bot: phil.bot,
                channelId: message.channelId,
                message: 'This server has not provided a link to a shared map of the fandom.'
            });
        }

        return DiscordPromises.sendMessage(phil.bot, message.channelId, message.serverConfig.fandomMapLink);
    }
};
