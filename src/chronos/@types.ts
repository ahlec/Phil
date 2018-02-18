import { Client as DiscordIOClient } from 'discord.io';
import { Database } from '../phil/database';

export interface Chrono {
    (bot : DiscordIOClient, db : Database, serverId : string, now : Date) : Promise<void>;
}

export interface ChronoLookup {
    [chronoHandle : string] : Chrono;
}
