import CommandInvocation from '@phil/CommandInvocation';
import Phil from '@phil/phil';
import { EmbedField } from '@phil/promises/discord';
import ServerConfig from '@phil/server-config';
import {
  ConfigCommandBase,
  ConfigProperty,
} from '@phil/commands/bases/config-command-base';
import {
  ConfigAction,
  ConfigActionParameterType,
  ConfigActionPrimaryKey,
} from './@action';

class DisplayConfigAction<TModel> implements ConfigAction<TModel> {
  public readonly primaryKey = ConfigActionPrimaryKey.Display;
  public readonly aliases = ['show'];
  public readonly description = `view a list of all of the configuration properties as well as their current values`;
  public readonly isPropertyRequired = false;
  public readonly specialUsageNotes = null;
  public readonly parameters: ReadonlyArray<ConfigActionParameterType> = [];

  public async process(
    command: ConfigCommandBase<TModel>,
    phil: Phil,
    invocation: CommandInvocation,
    mutableArgs: string[],
    _: ConfigProperty<TModel>,
    model: TModel
  ): Promise<void> {
    const fields: EmbedField[] = [];
    for (const property of command.orderedProperties) {
      fields.push(
        this.getDisplayRequestField(model, property, invocation.serverConfig)
      );
    }

    await invocation.respond({
      color: 'powder-blue',
      description: null,
      fields,
      footer: null,
      title: command.titleCaseConfigurationFor + ' Configuration: Overview',
      type: 'embed',
    });
  }

  private getDisplayRequestField(
    model: TModel,
    property: ConfigProperty<TModel>,
    serverConfig: ServerConfig
  ): EmbedField {
    const currentValue = property.getValue(model);
    const displayValue = property.typeDefinition.toDisplayFormat(
      currentValue,
      serverConfig
    );
    return {
      name: `:small_blue_diamond: ${property.displayName} [key: \`${property.key}\`]`,
      value: displayValue,
    };
  }
}

export default DisplayConfigAction;
