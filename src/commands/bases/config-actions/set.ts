import Phil from '../../../phil';
import ServerConfig from '../../../server-config';
import { ConfigProperty } from '../config-command-base';
import { ConfigActionParameterType, ConfigActionPrimaryKey } from './@action';
import MutateConfigActionBase, { GetNewValueResult } from './@mutate-base';

export default class SetConfigAction<TModel> extends MutateConfigActionBase<
  TModel
> {
  public readonly primaryKey = ConfigActionPrimaryKey.Set;
  public readonly aliases = ['show'];
  public readonly description = `sets the value of the property to a valid value of your choosing`;
  public readonly specialUsageNotes = `It is in the special case of the **${
    ConfigActionPrimaryKey.Set
  }** action that you need to provide an extra final piece of information at the end: the desired new value. You can use the **${
    ConfigActionPrimaryKey.Info
  }** action to see rules for what a valid value should look like and what the property does, in order to understand what to change the value to.`;
  public readonly parameters = [
    ConfigActionParameterType.PropertyKey,
    ConfigActionParameterType.NewPropertyValue,
  ];

  protected readonly pastTenseVerb = 'set';

  protected getNewValue(
    phil: Phil,
    serverConfig: ServerConfig,
    property: ConfigProperty<TModel>,
    mutableArgs: string[]
  ): GetNewValueResult {
    const rawInput = mutableArgs.join(' ');
    if (!rawInput) {
      return {
        errorMessage: 'You must provide a value when setting a property value.',
        wasSuccessful: false,
      };
    }

    const result = property.typeDefinition.tryParse(rawInput);
    if (result.wasSuccessful === false) {
      return result;
    }

    const validityResult = property.typeDefinition.isValid(
      result.parsedValue,
      phil,
      serverConfig
    );
    if (validityResult.isValid === false) {
      return {
        errorMessage: validityResult.errorMessage,
        wasSuccessful: false,
      };
    }

    return result;
  }
}
