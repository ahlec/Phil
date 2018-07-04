import Feature from '../features/feature';
import { HelpGroup } from '../help-groups';
import PublicMessage from '../messages/public';
import PermissionLevel from '../permission-level';
import Phil from '../phil';

export default interface ICommand {
    readonly name: string;
    readonly aliases: ReadonlyArray<string>;
    readonly feature?: Feature;
    readonly permissionLevel: PermissionLevel;

    readonly helpGroup: HelpGroup;
    readonly helpDescription: string;
    readonly versionAdded: number;

    processMessage(phil: Phil, message: PublicMessage, commandArgs: ReadonlyArray<string>): Promise<any>;
}

export interface ICommandLookup {
    [name: string]: ICommand;
}
