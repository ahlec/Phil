import EmbedColor from '../../../embed-color';
import PublicMessage from '@phil/messages/public';
import Phil from '../../../phil';
import { sendEmbedMessage, EmbedField } from '@phil/promises/discord';
import ServerConfig from '../../../server-config';
import { ConfigCommandBase, ConfigProperty } from '../config-command-base';
import {
  ConfigAction,
  ConfigActionParameterType,
  ConfigActionPrimaryKey,
} from './@action';

export default class DisplayConfigAction<TModel>
  implements ConfigAction<TModel> {
  public readonly primaryKey = ConfigActionPrimaryKey.Display;
  public readonly aliases = ['show'];
  public readonly description = `view a list of all of the configuration properties as well as their current values`;
  public readonly isPropertyRequired = false;
  public readonly specialUsageNotes = null;
  public readonly parameters: ReadonlyArray<ConfigActionParameterType> = [];

  public async process(
    command: ConfigCommandBase<TModel>,
    phil: Phil,
    message: PublicMessage,
    mutableArgs: string[],
    _: ConfigProperty<TModel>,
    model: TModel
  ): Promise<void> {
    const fields: EmbedField[] = [];
    for (const property of command.orderedProperties) {
      fields.push(
        this.getDisplayRequestField(model, property, message.serverConfig)
      );
    }

    await sendEmbedMessage(phil.bot, message.channelId, {
      color: EmbedColor.Info,
      fields,
      title: command.titleCaseConfigurationFor + ' Configuration: Overview',
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
