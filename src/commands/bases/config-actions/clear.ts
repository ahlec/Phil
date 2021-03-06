import { ConfigProperty } from '@phil/commands/bases/config-command-base';
import { ConfigActionParameterType, ConfigActionPrimaryKey } from './@action';
import MutateConfigActionBase, { GetNewValueResult } from './@mutate-base';

class ClearConfigAction<TModel> extends MutateConfigActionBase<TModel> {
  public readonly primaryKey = ConfigActionPrimaryKey.Clear;
  public readonly aliases = ['reset'];
  public readonly description = `resets the value of the property to the default for that property`;
  public readonly specialUsageNotes = null;
  public readonly isPropertyRequired = true;
  public readonly parameters = [ConfigActionParameterType.PropertyKey];

  protected readonly pastTenseVerb = 'reset';

  protected getNewValue(
    property: ConfigProperty<TModel>
  ): Promise<GetNewValueResult> {
    return Promise.resolve({
      parsedValue: property.defaultValue,
      wasSuccessful: true,
    });
  }
}

export default ClearConfigAction;
