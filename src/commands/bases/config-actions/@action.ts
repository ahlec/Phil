import CommandInvocation from '@phil/CommandInvocation';
import Phil from '@phil/phil';
import {
  ConfigCommandBase,
  ConfigProperty,
} from '@phil/commands/bases/config-command-base';

export enum ConfigActionParameterType {
  PropertyKey,
  NewPropertyValue,
}

export enum ConfigActionPrimaryKey {
  Clear = 'clear',
  Display = 'display',
  Info = 'info',
  Set = 'set',
}

export interface ConfigAction<TModel> {
  readonly primaryKey: ConfigActionPrimaryKey;
  readonly aliases: ReadonlyArray<string>;
  readonly description: string;
  readonly specialUsageNotes: string | null;
  readonly isPropertyRequired: boolean;
  readonly parameters: ReadonlyArray<ConfigActionParameterType>;

  process(
    invocation: CommandInvocation,
    command: ConfigCommandBase<TModel>,
    model: TModel,
    property: ConfigProperty<TModel> | null,
    phil: Phil,
    mutableArgs: string[]
  ): Promise<void>;
}
