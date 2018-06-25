import Feature from '../features/feature';
import { HelpGroup } from '../help-groups';
import PublicMessage from '../messages/public';
import Phil from '../phil';

export default interface ICommand {
    readonly name: string;
    readonly aliases: ReadonlyArray<string>;
    readonly feature?: Feature;

    readonly helpGroup: HelpGroup;
    readonly helpDescription: string;
    readonly versionAdded: number;

    readonly isAdminCommand: boolean;
    processMessage(phil: Phil, message: PublicMessage, commandArgs: ReadonlyArray<string>): Promise<any>;
}

export interface ICommandLookup {
    [name: string]: ICommand;
}
