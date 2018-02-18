import { Client as DiscordIOClient } from 'discord.io';
import { DiscordMessage } from '../phil/discord-message';
import { Database } from '../phil/database';

export interface CommandProcessFunction {
    (bot : DiscordIOClient, message : DiscordMessage, commandArgs : string[], db: Database ) : Promise<void>;
}

export interface Command {
    readonly aliases : string[];

    readonly helpDescription : string;
    readonly versionAdded : number;

    readonly publicRequiresAdmin? : boolean;
    processPublicMessage? : CommandProcessFunction;

    readonly privateRequiresAdmin? : boolean;
    processPrivateMessage? : CommandProcessFunction;
}

export interface CommandLookup {
    [commandName : string] : Command;
}
