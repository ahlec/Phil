import { Client as DiscordIOClient } from 'discord.io';
import { DiscordMessage } from '../phil/discord-message';
import { Database } from '../phil/database';

export interface Analyzer {
    readonly handle : string;
    process(bot : DiscordIOClient, message : DiscordMessage, db : Database) : Promise<void>;
}

export interface IAnalyzerLookup {
    [analyzerName : string] : Analyzer;
}
