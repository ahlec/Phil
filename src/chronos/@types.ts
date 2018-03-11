import { Client as DiscordIOClient, Server as DiscordIOServer } from 'discord.io';
import { Database } from '../phil/database';

export interface Chrono {
    readonly handle : string;

    process(bot : DiscordIOClient, db : Database, server : DiscordIOServer, now : Date) : Promise<void>;
}

export interface IChronoLookup {
    [chronoHandle : string] : Chrono;
}
