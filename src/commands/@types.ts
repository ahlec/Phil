import { Phil } from '../phil/phil';
import { IPublicMessage } from 'phil';
import { Database } from '../phil/database';
import { HelpGroup } from '../phil/help-groups';
import { Feature } from '../phil/features';

export interface Command {
    readonly name : string;
    readonly aliases : string[];
    readonly feature : Feature | null;

    readonly helpGroup : HelpGroup;
    readonly helpDescription : string;
    readonly versionAdded : number;

    readonly publicRequiresAdmin? : boolean;
    processPublicMessage(phil : Phil, message : IPublicMessage, commandArgs : string[]) : Promise<any>;
}

export interface ICommandLookup {
    [name : string] : Command;
}
