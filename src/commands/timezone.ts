'use strict';

import { Command } from './@types';
import { HelpGroup } from '../phil/help-groups';
import { Client as DiscordIOClient } from 'discord.io';
import { DiscordMessage } from '../phil/discord-message';
import { Database } from '../phil/database';
import { BotUtils } from '../phil/utils';
import { DiscordPromises } from '../promises/discord';
import { Features } from '../phil/features';
import { TimezoneQuestionnaire } from '../phil/timezone-questionnaire';

export class TimezoneCommand implements Command {
    readonly name = 'timezone';
    readonly aliases = [ 'timezones', 'tz' ];
    readonly feature = Features.TimezoneProcessing;

    readonly helpGroup = HelpGroup.Time;
    readonly helpDescription = 'Begins a private message dialogue with Phil to set your timezone, or to change your current timezone.';

    readonly versionAdded = 8;

    readonly publicRequiresAdmin = false;
    processPublicMessage(bot : DiscordIOClient, message : DiscordMessage, commandArgs : string[], db : Database) : Promise<any> {
        return TimezoneQuestionnaire.startQuestionnaire(bot, db, message.userId, true);
    }

    readonly privateRequiresAdmin = false;
    processPrivateMessage(bot : DiscordIOClient, message : DiscordMessage, commandArgs : string[], db : Database) : Promise<any> {
        return TimezoneQuestionnaire.startQuestionnaire(bot, db, message.userId, true);
    }
};
