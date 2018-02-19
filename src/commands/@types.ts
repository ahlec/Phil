import { Client as DiscordIOClient } from 'discord.io';
import { DiscordMessage } from '../phil/discord-message';
import { Database } from '../phil/database';
import { HelpGroup } from '../phil/help-groups';

export interface CommandProcessFunction {
    (bot : DiscordIOClient, message : DiscordMessage, commandArgs : string[], db: Database ) : Promise<any>;
}

export interface Command {
    readonly name : string;
    readonly aliases : string[];

    readonly helpGroup : HelpGroup;
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
