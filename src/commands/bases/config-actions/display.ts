import Server from '@phil/discord/Server';

import CommandInvocation from '@phil/CommandInvocation';
import { EmbedField } from '@phil/promises/discord';
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
    invocation: CommandInvocation,
    command: ConfigCommandBase<TModel>,
    model: TModel
  ): Promise<void> {
    const fields = await Promise.all(
      command.orderedProperties.map((property) =>
        this.getDisplayRequestField(model, property, invocation.context.server)
      )
    );

    await invocation.respond({
      color: 'powder-blue',
      description: null,
      fields,
      footer: null,
      title: command.titleCaseConfigurationFor + ' Configuration: Overview',
      type: 'embed',
    });
  }

  private async getDisplayRequestField(
    model: TModel,
    property: ConfigProperty<TModel>,
    server: Server
  ): Promise<EmbedField> {
    const currentValue = property.getValue(model);
    const { regularChat: displayValue } = await property.typeDefinition.format(
      currentValue,
      server
    );
    return {
      name: `:small_blue_diamond: ${property.displayName} [key: \`${property.key}\`]`,
      value: displayValue,
    };
  }
}

export default DisplayConfigAction;
