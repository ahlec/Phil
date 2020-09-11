import Server from '@phil/discord/Server';

import CommandInvocation from '@phil/CommandInvocation';
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

abstract class MutateConfigActionBase<TModel> implements ConfigAction<TModel> {
  public abstract readonly primaryKey: ConfigActionPrimaryKey;
  public abstract readonly aliases: ReadonlyArray<string>;
  public abstract readonly description: string;
  public abstract readonly specialUsageNotes: string | null;
  public readonly isPropertyRequired = true;
  public abstract readonly parameters: ReadonlyArray<ConfigActionParameterType>;

  protected abstract readonly pastTenseVerb: string;

  public async process(
    invocation: CommandInvocation,
    command: ConfigCommandBase<TModel>,
    model: TModel,
    property: ConfigProperty<TModel>,
    mutableArgs: string[]
  ): Promise<void> {
    const newValue = await this.getNewValue(
      property,
      invocation.context.server,
      mutableArgs
    );
    if (newValue.wasSuccessful === false) {
      await this.sendInvalidInputResponse(
        command,
        invocation,
        property,
        newValue.errorMessage
      );
      return;
    }

    await property.setValue(model, newValue.parsedValue);
    await this.sendMutateSuccessMessage(
      invocation,
      property,
      newValue.parsedValue
    );
  }

  protected abstract getNewValue(
    property: ConfigProperty<TModel>,
    server: Server,
    mutableArgs: string[]
  ): Promise<GetNewValueResult>;

  private async sendInvalidInputResponse(
    command: ConfigCommandBase<TModel>,
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
      invocation.context.serverConfig.commandPrefix
    }${command.name} ${ConfigActionPrimaryKey.Info} ${property.key}\`.`;

    await invocation.respond({
      color: 'red',
      description: response,
      fields: null,
      footer: null,
      title: `${property.displayName}: Invalid Input`,
      type: 'embed',
    });
  }

  private async sendMutateSuccessMessage(
    invocation: CommandInvocation,
    property: ConfigProperty<TModel>,
    newValue: string | null
  ): Promise<void> {
    const {
      multilineCodeBlock: formattedNewValue,
    } = await property.typeDefinition.format(
      newValue,
      invocation.context.server
    );
    await invocation.respond({
      color: 'green',
      description: `The value of the **${property.displayName.toLowerCase()}** has been ${
        this.pastTenseVerb
      } successfully to now be \`${formattedNewValue}\`.`,
      fields: null,
      footer: null,
      title: `${property.displayName} Changed Successfully`,
      type: 'embed',
    });
  }
}

export default MutateConfigActionBase;
