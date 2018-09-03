import Phil from '../../../phil';
import ServerConfig from '../../../server-config';
import { ParseResult } from '../../../type-definition/@type-definition';
import { IConfigProperty } from '../config-command-base';
import { ConfigActionParameterType, ConfigActionPrimaryKey } from './@action';
import MutateConfigActionBase from './@mutate-base';

const NOWRAP = '';

export default class SetConfigAction<TModel> extends MutateConfigActionBase<TModel> {
    public readonly primaryKey = ConfigActionPrimaryKey.Set;
    public readonly aliases = ['show'];
    public readonly description = `sets the value of the property to a valid value of your ${
        NOWRAP}choosing`;
    public readonly specialUsageNotes = `It is in the special case of the **${
        ConfigActionPrimaryKey.Set}** action that you need to provide an ${
        NOWRAP}extra final piece of information at the end: the desired new value. You can ${
        NOWRAP}use the **${ConfigActionPrimaryKey.Info}** action to see rules for what a valid ${
        NOWRAP}value should look like and what the property does, in order to understand what to ${
        NOWRAP}change the value to.`;
    public readonly parameters = [
        ConfigActionParameterType.PropertyKey,
        ConfigActionParameterType.NewPropertyValue
    ];

    protected readonly pastTenseVerb = 'set';

    protected getNewValue(phil: Phil, serverConfig: ServerConfig, property: IConfigProperty<TModel>,
        mutableArgs: string[]): ParseResult {
        const rawInput = mutableArgs.join(' ');
        if (!rawInput) {
            return {
                errorMessage: 'You must provide a value when setting a property value.',
                wasSuccessful: false
            };
        }

        const result = property.typeDefinition.tryParse(rawInput);
        if (result.wasSuccessful === false) {
            return result;
        }

        const validityResult = property.typeDefinition.isValid(result.parsedValue, phil,
            serverConfig);
        if (validityResult.isValid === false) {
            return {
                errorMessage: validityResult.errorMessage,
                wasSuccessful: false
            };
        }

        return result;
    }
}
