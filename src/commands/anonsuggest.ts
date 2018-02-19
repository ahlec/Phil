'use strict';

import { Command } from './@types';
import { HelpGroup } from '../phil/help-groups';
import { Client as DiscordIOClient } from 'discord.io';
import { DiscordMessage } from '../phil/discord-message';
import { Database } from '../phil/database';

const suggesting = require('../phil/suggesting');

export class AnonSuggestCommand implements Command {
    public readonly name = 'anonsuggest';
    public readonly aliases : string[];

    public readonly helpGroup = HelpGroup.Prompts;
    public readonly helpDescription = 'Suggests a new prompt to Phil anonymously. Your name will not be displayed, but you will still receive leaderboard points should it be approved. (*DIRECT MESSAGE ONLY*)';

    public readonly versionAdded = 11;

    public readonly privateRequiresAdmin = false;
    public processPrivateMessage(bot : DiscordIOClient, message : DiscordMessage, commandArgs : string[], db : Database) : Promise<any> {
        return suggesting.suggestCommand(bot, message, commandArgs, db, 'anonsuggest', true);
    }
}
