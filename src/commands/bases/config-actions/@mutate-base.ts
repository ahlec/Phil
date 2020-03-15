import EmbedColor from '../../../embed-color';
import PublicMessage from '../../../messages/public';
import Phil from '../../../phil';
import { sendEmbedMessage } from '../../../promises/discord';
import ServerConfig from '../../../server-config';
import { ConfigCommandBase, ConfigProperty } from '../config-command-base';
import {
  ConfigAction,
  ConfigActionParameterType,
  ConfigActionPrimaryKey,
} from './@action';

const NEWLINE = '\n';
const NOWRAP = '';

export type GetNewValueResult =
  | { wasSuccessful: false; errorMessage: string }
  | { wasSuccessful: true; parsedValue: string | null };

export default abstract class MutateConfigActionBase<TModel>
  implements ConfigAction<TModel> {
  public abstract readonly primaryKey: ConfigActionPrimaryKey;
  public abstract readonly aliases: ReadonlyArray<string>;
  public abstract readonly description: string;
  public abstract readonly specialUsageNotes: string | null;
  public readonly isPropertyRequired = true;
  public abstract readonly parameters: ReadonlyArray<ConfigActionParameterType>;

  protected abstract readonly pastTenseVerb: string;

  public async process(
    command: ConfigCommandBase<TModel>,
    phil: Phil,
    message: PublicMessage,
    mutableArgs: string[],
    property: ConfigProperty<TModel>,
    model: TModel
  ): Promise<any> {
    const newValue = this.getNewValue(
      phil,
      message.serverConfig,
      property,
      mutableArgs
    );
    if (newValue.wasSuccessful === false) {
      return this.sendInvalidInputResponse(
        command,
        phil,
        message,
        property,
        newValue.errorMessage
      );
    }

    await property.setValue(phil, model, newValue.parsedValue);
    return this.sendMutateSuccessMessage(
      phil,
      message,
      property,
      newValue.parsedValue
    );
  }

  protected abstract getNewValue(
    phil: Phil,
    serverConfig: ServerConfig,
    property: ConfigProperty<TModel>,
    mutableArgs: string[]
  ): GetNewValueResult;

  private async sendInvalidInputResponse(
    command: ConfigCommandBase<TModel>,
    phil: Phil,
    message: PublicMessage,
    property: ConfigProperty<TModel>,
    errorMessage: string
  ): Promise<any> {
    const response = `The value you attempted to set the ${
      property.displayName
    } property to ${NOWRAP}is invalid.${NEWLINE}${NEWLINE}**${errorMessage}**${NEWLINE}${NEWLINE}Proper values for the ${
      property.displayName
    } property must obey the ${NOWRAP}following rules:${command.getPropertyRulesDisplayList(
      property
    )}${NEWLINE}${NEWLINE}To learn more about this property, including viewing example values you can ${NOWRAP}use for your server, use the command \`${
      message.serverConfig.commandPrefix
    }${command.name} ${ConfigActionPrimaryKey.Info} ${property.key}\`.`;

    return sendEmbedMessage(phil.bot, message.channelId, {
      color: EmbedColor.Error,
      description: response,
      title: `${property.displayName}: Invalid Input`,
    });
  }

  private async sendMutateSuccessMessage(
    phil: Phil,
    message: PublicMessage,
    property: ConfigProperty<TModel>,
    newValue: string | null
  ): Promise<any> {
    return sendEmbedMessage(phil.bot, message.channelId, {
      color: EmbedColor.Success,
      description: `The value of the **${property.displayName.toLowerCase()}** has been ${
        this.pastTenseVerb
      } successfully to now be \`${property.typeDefinition.toMultilineCodeblockDisplayFormat(
        newValue,
        phil,
        message.serverConfig
      )}\`.`,
      title: `${property.displayName} Changed Successfully`,
    });
  }
}
