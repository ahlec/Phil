'use strict';

import { Command } from './@types';
import { HelpGroup } from '../phil/help-groups';
import { Client as DiscordIOClient } from 'discord.io';
import { DiscordMessage } from '../phil/discord-message';
import { Database } from '../phil/database';
import { instance as DiscordPromises } from '../promises/discord';
import { Feature } from '../phil/features';
import { Versions } from '../phil/versions';

export class VersionCommand implements Command {
    readonly name = 'version';
    readonly aliases = ['versions'];
    readonly feature : Feature = null;

    readonly helpGroup = HelpGroup.General;
    readonly helpDescription = 'Prints out the current version numbers related to Phil.';

    readonly versionAdded = 3;

    readonly publicRequiresAdmin = false;
    processPublicMessage(bot : DiscordIOClient, message : DiscordMessage, commandArgs : string[], db : Database) : Promise<any> {
        const reply = '**Code:** Version ' + Versions.CODE + '.\n**Database:** Version ' + Versions.DATABASE + '.';
        return DiscordPromises.sendMessage(bot, message.channelId, reply);
    }
};
