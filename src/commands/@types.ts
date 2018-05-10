import { Phil } from '../phil/phil';
import { DiscordMessage } from '../phil/discord-message';
import { Database } from '../phil/database';
import { HelpGroup } from '../phil/help-groups';
import { Feature } from '../phil/features';

export interface CommandProcessFunction {
    (phil : Phil, message : DiscordMessage, commandArgs : string[]) : Promise<any>;
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
