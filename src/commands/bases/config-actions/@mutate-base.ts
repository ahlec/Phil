import CommandInvocation from '@phil/CommandInvocation';
import EmbedColor from '@phil/embed-color';
import Phil from '@phil/phil';
import { sendEmbedMessage } from '@phil/promises/discord';
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
    invocation: CommandInvocation,
    mutableArgs: string[],
    property: ConfigProperty<TModel>,
    model: TModel
  ): Promise<void> {
    const newValue = this.getNewValue(
      phil,
      invocation.serverConfig,
      property,
      mutableArgs
    );
    if (newValue.wasSuccessful === false) {
      await this.sendInvalidInputResponse(
        command,
        phil,
        invocation,
        property,
        newValue.errorMessage
      );
      return;
    }

    await property.setValue(phil, model, newValue.parsedValue);
    await this.sendMutateSuccessMessage(
      phil,
      invocation,
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
    invocation: CommandInvocation,
    property: ConfigProperty<TModel>,
    errorMessage: string
  ): Promise<void> {
    const response = `The value you attempted to set the ${
      property.displayName
    } property to ${NOWRAP}is invalid.${NEWLINE}${NEWLINE}**${errorMessage}**${NEWLINE}${NEWLINE}Proper values for the ${
      property.displayName
    } property must obey the ${NOWRAP}following rules:${command.getPropertyRulesDisplayList(
      property
    )}${NEWLINE}${NEWLINE}To learn more about this property, including viewing example values you can ${NOWRAP}use for your server, use the command \`${
      invocation.serverConfig.commandPrefix
    }${command.name} ${ConfigActionPrimaryKey.Info} ${property.key}\`.`;

    await sendEmbedMessage(phil.bot, invocation.channelId, {
      color: EmbedColor.Error,
      description: response,
      title: `${property.displayName}: Invalid Input`,
    });
  }

  private async sendMutateSuccessMessage(
    phil: Phil,
    invocation: CommandInvocation,
    property: ConfigProperty<TModel>,
    newValue: string | null
  ): Promise<void> {
    await sendEmbedMessage(phil.bot, invocation.channelId, {
      color: EmbedColor.Success,
      description: `The value of the **${property.displayName.toLowerCase()}** has been ${
        this.pastTenseVerb
      } successfully to now be \`${property.typeDefinition.toMultilineCodeblockDisplayFormat(
        newValue,
        phil,
        invocation.serverConfig
      )}\`.`,
      title: `${property.displayName} Changed Successfully`,
    });
  }
}
