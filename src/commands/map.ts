'use strict';

import { Command } from './@types';
import { Phil } from '../phil/phil';
import { HelpGroup } from '../phil/help-groups';
import { DiscordMessage } from '../phil/discord-message';
import { DiscordPromises } from '../promises/discord';
import { Feature } from '../phil/features';

export class MapCommand implements Command {
    readonly name = 'map';
    readonly aliases : string[] = [];
    readonly feature : Feature = null;

    readonly helpGroup = HelpGroup.General;
    readonly helpDescription = 'Has Phil provide a link to the editable map of the fandom.';

    readonly versionAdded = 8;

    readonly publicRequiresAdmin = false;
    processPublicMessage(phil : Phil, message : DiscordMessage, commandArgs : string[]) : Promise<any> {
        return DiscordPromises.sendMessage(phil.bot, message.channelId, process.env.HIJACK_FANDOM_GOOGLE_MAP_LINK);
    }
};
