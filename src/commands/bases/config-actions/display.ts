import EmbedColor from '../../../embed-color';
import PublicMessage from '../../../messages/public';
import Phil from '../../../phil';
import { DiscordPromises, IEmbedField } from '../../../promises/discord';
import ServerConfig from '../../../server-config';
import { ConfigCommandBase, IConfigProperty } from '../config-command-base';
import { ConfigActionParameterType, ConfigActionPrimaryKey, IConfigAction } from './@action';

const NOWRAP = '';

export default class DisplayConfigAction<TModel> implements IConfigAction<TModel> {
    public readonly primaryKey = ConfigActionPrimaryKey.Display;
    public readonly aliases = ['show'];
    public readonly description = `view a list of all of the configuration properties as well as ${
        NOWRAP} their current values`;
    public readonly isPropertyRequired = false;
    public readonly parameters: ReadonlyArray<ConfigActionParameterType> = [];

    public async process(command: ConfigCommandBase<TModel>, phil: Phil, message: PublicMessage,
        mutableArgs: string[], _: IConfigProperty<TModel>, model: TModel): Promise<any> {
            const fields: IEmbedField[] = [];
            for (const property of command.orderedProperties) {
                fields.push(this.getDisplayRequestField(model, property, message.serverConfig));
            }

            return DiscordPromises.sendEmbedMessage(phil.bot, message.channelId, {
                color: EmbedColor.Info,
                fields,
                title: command.titleCaseConfigurationFor + ' Configuration: Overview'
            });
    }

    private getDisplayRequestField(model: TModel, property: IConfigProperty<TModel>,
        serverConfig: ServerConfig): IEmbedField {
            const currentValue = property.getValue(model);
            const displayValue = property.typeDefinition.toDisplayFormat(currentValue, serverConfig);
            return {
                name: `:small_blue_diamond: ${property.displayName} [key: \`${property.key}\`]`,
                value: displayValue
            };
    }
}
