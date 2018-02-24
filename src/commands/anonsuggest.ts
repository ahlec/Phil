'use strict';

import { Command } from './@types';
import { HelpGroup } from '../phil/help-groups';
import { Client as DiscordIOClient } from 'discord.io';
import { DiscordMessage } from '../phil/discord-message';
import { Database } from '../phil/database';
import { SuggestingUtils } from '../phil/suggesting';
import { Features } from '../phil/features';

export class AnonSuggestCommand implements Command {
    readonly name = 'anonsuggest';
    readonly aliases : string[] = [];
    readonly feature = Features.Prompts;

    readonly helpGroup = HelpGroup.Prompts;
    readonly helpDescription = 'Suggests a new prompt to Phil anonymously. Your name will not be displayed, but you will still receive leaderboard points should it be approved. (*DIRECT MESSAGE ONLY*)';

    readonly versionAdded = 11;

    readonly privateRequiresAdmin = false;
    async processPrivateMessage(bot : DiscordIOClient, message : DiscordMessage, commandArgs : string[], db : Database) : Promise<any> {
        return SuggestingUtils.suggestCommand(bot, message, commandArgs, db, 'anonsuggest', true);
    }
}
