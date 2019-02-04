import Phil from '../../../phil';
import ServerConfig from '../../../server-config';
import { IConfigProperty } from '../config-command-base';
import { ConfigActionParameterType, ConfigActionPrimaryKey } from './@action';
import MutateConfigActionBase, { GetNewValueResult } from './@mutate-base';

const NOWRAP = '';

export default class ClearConfigAction<TModel> extends MutateConfigActionBase<
  TModel
> {
  public readonly primaryKey = ConfigActionPrimaryKey.Clear;
  public readonly aliases = ['reset'];
  public readonly description = `resets the value of the property to the default for that ${NOWRAP}property`;
  public readonly specialUsageNotes = null;
  public readonly isPropertyRequired = true;
  public readonly parameters = [ConfigActionParameterType.PropertyKey];

  protected readonly pastTenseVerb = 'reset';

  protected getNewValue(
    phil: Phil,
    serverConfig: ServerConfig,
    property: IConfigProperty<TModel>,
    mutableArgs: string[]
  ): GetNewValueResult {
    return {
      parsedValue: property.defaultValue,
      wasSuccessful: true,
    };
  }
}
