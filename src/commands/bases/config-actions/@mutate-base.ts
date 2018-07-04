import EmbedColor from '../../../embed-color';
import PublicMessage from '../../../messages/public';
import Phil from '../../../phil';
import { DiscordPromises } from '../../../promises/discord';
import ServerConfig from '../../../server-config';
import { ParseResult } from '../../../type-definition/@type-definition';
import { ConfigCommandBase, IConfigProperty } from '../config-command-base';
import { ConfigActionParameterType, ConfigActionPrimaryKey, IConfigAction } from './@action';

const NEWLINE = '\n';
const NOWRAP = '';

export default abstract class MutateConfigActionBase<TModel> implements IConfigAction<TModel> {
    public abstract readonly primaryKey: ConfigActionPrimaryKey;
    public abstract readonly aliases: ReadonlyArray<string>;
    public abstract readonly description: string;
    public abstract readonly specialUsageNotes: string;
    public readonly isPropertyRequired = true;
    public abstract readonly parameters: ReadonlyArray<ConfigActionParameterType>;

    protected abstract readonly pastTenseVerb: string;

    public async process(command: ConfigCommandBase<TModel>, phil: Phil, message: PublicMessage,
        mutableArgs: string[], property: IConfigProperty<TModel>, model: TModel): Promise<any> {
        const newValue = this.getNewValue(phil, message.serverConfig, property, mutableArgs);
        if (newValue.wasSuccessful === false) {
            return this.sendInvalidInputResponse(command, phil, message, property,
                newValue.errorMessage);
        }

        await property.setValue(phil, model, newValue.parsedValue);
        return this.sendMutateSuccessMessage(phil, message, property, newValue.parsedValue);
    }

    protected abstract getNewValue(phil: Phil, serverConfig: ServerConfig,
        property: IConfigProperty<TModel>, mutableArgs: string[]): ParseResult;

    private async sendInvalidInputResponse(command: ConfigCommandBase<TModel>, phil: Phil,
        message: PublicMessage, property: IConfigProperty<TModel>, errorMessage: string): Promise<any> {
        const response = `The value you attempted to set the ${property.displayName} property to ${
            NOWRAP}is invalid.${
            NEWLINE}${
            NEWLINE}**${errorMessage}**${
            NEWLINE}${
            NEWLINE}Proper values for the ${property.displayName} property must obey the ${
            NOWRAP}following rules:${command.getPropertyRulesDisplayList(property)}${
            NEWLINE}${
            NEWLINE}To learn more about this property, including viewing example values you can ${
            NOWRAP}use for your server, use the command \`${message.serverConfig.commandPrefix}${
            command.name} ${ConfigActionPrimaryKey.Info} ${property.key}\`.`;

        return DiscordPromises.sendEmbedMessage(phil.bot, message.channelId, {
            color: EmbedColor.Error,
            description: response,
            title: `${property.displayName}: Invalid Input`
        });
    }

    private async sendMutateSuccessMessage(phil: Phil, message: PublicMessage,
        property: IConfigProperty<TModel>, newValue: string): Promise<any> {
        return DiscordPromises.sendEmbedMessage(phil.bot, message.channelId, {
            color: EmbedColor.Success,
            description: `The value of the **${property.displayName.toLowerCase()}** has been ${
                this.pastTenseVerb} successfully to now be \`${
                property.typeDefinition.toDisplayFormat(newValue, message.serverConfig)}\`.`,
            title: `${property.displayName} Changed Successfully`
        })
    }
}
