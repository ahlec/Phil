'use strict';

import { Command } from './@types';
import { Phil } from '../phil/phil';
import { HelpGroup } from '../phil/help-groups';
import { IPublicMessage } from 'phil';
import { DiscordPromises } from '../promises/discord';
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
    processPublicMessage(phil : Phil, message : IPublicMessage, commandArgs : string[]) : Promise<any> {
        const reply = '**Code:** Version ' + Versions.CODE + '.\n**Database:** Version ' + Versions.DATABASE + '.';
        return DiscordPromises.sendMessage(phil.bot, message.channelId, reply);
    }
};
