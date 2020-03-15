import EmbedColor from '../../../embed-color';
import PublicMessage from '@phil/messages/public';
import Phil from '../../../phil';
import { sendEmbedMessage } from '@phil/promises/discord';
import { ConfigCommandBase, ConfigProperty } from '../config-command-base';
import {
  ConfigAction,
  ConfigActionParameterType,
  ConfigActionPrimaryKey,
} from './@action';

const NEWLINE = '\n';

export default class InfoConfigAction<TModel> implements ConfigAction<TModel> {
  public readonly primaryKey = ConfigActionPrimaryKey.Info;
  public readonly aliases = ['show'];
  public readonly description = `see detailed information about a configuration property as well its current value`;
  public readonly isPropertyRequired = true;
  public readonly specialUsageNotes = null;
  public readonly parameters = [ConfigActionParameterType.PropertyKey];

  public async process(
    command: ConfigCommandBase<TModel>,
    phil: Phil,
    message: PublicMessage,
    mutableArgs: string[],
    property: ConfigProperty<TModel>,
    model: TModel
  ): Promise<void> {
    const currentValue = property.getValue(model);
    const displayValue = property.typeDefinition.toDisplayFormat(
      currentValue,
      message.serverConfig
    );
    const displayDefaultValue = property.typeDefinition.toDisplayFormat(
      property.defaultValue,
      message.serverConfig
    );
    let response = `${
      property.description
    }${NEWLINE}${NEWLINE}Current Value: **${displayValue}**${NEWLINE}Default Value: ${displayDefaultValue}${NEWLINE}${NEWLINE}**RULES**${command.getPropertyRulesDisplayList(
      property
    )}`;

    const randomExample = property.getRandomExampleValue(model);
    const randomDisplayValue = property.typeDefinition.toMultilineCodeblockDisplayFormat(
      randomExample,
      phil,
      message.serverConfig
    );
    response += `${NEWLINE}**EXAMPLES**${NEWLINE}\`\`\`${message.serverConfig.commandPrefix}${command.name} ${ConfigActionPrimaryKey.Set} ${property.key} ${randomDisplayValue}${NEWLINE}${message.serverConfig.commandPrefix}${command.name} ${ConfigActionPrimaryKey.Clear} ${property.key}\`\`\``;

    await sendEmbedMessage(phil.bot, message.channelId, {
      color: EmbedColor.Info,
      description: response,
      title: `${command.titleCaseConfigurationFor} Configuration: ${property.displayName}`,
    });
  }
}
