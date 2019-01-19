import EmbedColor from '../../../embed-color';
import PublicMessage from '../../../messages/public';
import Phil from '../../../phil';
import { DiscordPromises } from '../../../promises/discord';
import { ConfigCommandBase, IConfigProperty } from '../config-command-base';
import {
  ConfigActionParameterType,
  ConfigActionPrimaryKey,
  IConfigAction,
} from './@action';

const NEWLINE = '\n';
const NOWRAP = '';

export default class InfoConfigAction<TModel> implements IConfigAction<TModel> {
  public readonly primaryKey = ConfigActionPrimaryKey.Info;
  public readonly aliases = ['show'];
  public readonly description = `see detailed information about a configuration property ${NOWRAP}as well its current value`;
  public readonly isPropertyRequired = true;
  public readonly parameters = [ConfigActionParameterType.PropertyKey];

  public async process(
    command: ConfigCommandBase<TModel>,
    phil: Phil,
    message: PublicMessage,
    mutableArgs: string[],
    property: IConfigProperty<TModel>,
    model: TModel
  ): Promise<any> {
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
    response += `${NEWLINE}**EXAMPLES**${NEWLINE}\`\`\`${
      message.serverConfig.commandPrefix
    }${command.name} ${ConfigActionPrimaryKey.Set} ${
      property.key
    } ${randomDisplayValue}${NEWLINE}${message.serverConfig.commandPrefix}${
      command.name
    } ${ConfigActionPrimaryKey.Clear} ${property.key}\`\`\``;

    return DiscordPromises.sendEmbedMessage(phil.bot, message.channelId, {
      color: EmbedColor.Info,
      description: response,
      title: `${command.titleCaseConfigurationFor} Configuration: ${
        property.displayName
      }`,
    });
  }
}
