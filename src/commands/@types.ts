import { Client as DiscordIOClient } from 'discord.io';
import { DiscordMessage } from '../phil/discord-message';
import { Database } from '../phil/database';
import { HelpGroup } from '../phil/help-groups';
import { Feature } from '../phil/features';

export interface CommandProcessFunction {
    (bot : DiscordIOClient, message : DiscordMessage, commandArgs : string[], db: Database ) : Promise<any>;
}

export interface Command {
    readonly name : string;
    readonly aliases : string[];
    readonly feature : Feature | null;

    readonly helpGroup : HelpGroup;
    readonly helpDescription : string;
    readonly versionAdded : number;

    readonly publicRequiresAdmin? : boolean;
    processPublicMessage? : CommandProcessFunction;

    readonly privateRequiresAdmin? : boolean;
    processPrivateMessage? : CommandProcessFunction;
}

export interface ICommandLookup {
    [name : string] : Command;
}
