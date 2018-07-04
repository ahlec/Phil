import PublicMessage from '../../../messages/public';
import Phil from '../../../phil';
import { ConfigCommandBase, IConfigProperty } from '../config-command-base';

export enum ConfigActionParameterType {
    PropertyKey,
    NewPropertyValue
}

export enum ConfigActionPrimaryKey {
    Clear = 'clear',
    Display = 'display',
    Info = 'info',
    Set = 'set'
}

export interface IConfigAction<TModel> {
    readonly primaryKey: ConfigActionPrimaryKey;
    readonly aliases: ReadonlyArray<string>;
    readonly description: string;
    readonly specialUsageNotes?: string;
    readonly isPropertyRequired: boolean;
    readonly parameters: ReadonlyArray<ConfigActionParameterType>;

    process(command: ConfigCommandBase<TModel>, phil: Phil, message: PublicMessage,
        mutableArgs: string[], property: IConfigProperty<TModel>, model: TModel): Promise<any>;
}
