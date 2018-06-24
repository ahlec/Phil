import { IPublicMessage } from 'phil';
import Database from '../phil/database';
import Feature from '../phil/features/feature';
import { HelpGroup } from '../phil/help-groups';
import Phil from '../phil/phil';

export default interface ICommand {
    readonly name: string;
    readonly aliases: ReadonlyArray<string>;
    readonly feature?: Feature;

    readonly helpGroup: HelpGroup;
    readonly helpDescription: string;
    readonly versionAdded: number;

    readonly isAdminCommand: boolean;
    processMessage(phil: Phil, message: IPublicMessage, commandArgs: ReadonlyArray<string>): Promise<any>;
}

export interface ICommandLookup {
    [name: string]: ICommand;
}
