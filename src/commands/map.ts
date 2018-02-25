'use strict';

import { Command } from './@types';
import { HelpGroup } from '../phil/help-groups';
import { Client as DiscordIOClient } from 'discord.io';
import { DiscordMessage } from '../phil/discord-message';
import { Database } from '../phil/database';
import { instance as DiscordPromises } from '../promises/discord';
import { Feature } from '../phil/features';

export class MapCommand implements Command {
    readonly name = 'map';
    readonly aliases : string[] = [];
    readonly feature : Feature = null;

    readonly helpGroup = HelpGroup.General;
    readonly helpDescription = 'Has Phil provide a link to the editable map of the fandom.';

    readonly versionAdded = 8;

    readonly publicRequiresAdmin = false;
    processPublicMessage(bot : DiscordIOClient, message : DiscordMessage, commandArgs : string[], db : Database) : Promise<any> {
        return DiscordPromises.sendMessage(bot, message.channelId, process.env.HIJACK_FANDOM_GOOGLE_MAP_LINK);
    }
};
