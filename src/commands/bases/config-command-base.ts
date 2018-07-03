import EmbedColor from '../../embed-color';
import Feature from '../../features/feature';
import { HelpGroup } from '../../help-groups';
import PublicMessage from '../../messages/public';
import Phil from '../../phil';
import { DiscordPromises, IEmbedField } from '../../promises/discord';
import ServerConfig from '../../server-config';
import { ITypeDefinition, ParseResult } from '../../type-definition/@type-definition';
import BotUtils from '../../utils';
import ICommand from '../@types';

enum Action {
    Display = 'display',
    Set = 'set',
    Clear = 'reset',
    Info = 'explain'
}

type MutatingPropertyAction = Action.Set | Action.Clear;
type PropertyAction = MutatingPropertyAction | Action.Info;

const ActionVerbs: { [verb: string]: Action } = {
    'clear': Action.Clear,
    'display': Action.Display,
    'explain': Action.Info,
    'help': Action.Info,
    'info': Action.Info,
    'reset': Action.Clear,
    'set': Action.Set,
    'show': Action.Display
};

export interface IConfigProperty<TModel> {
    readonly defaultValue: string;
    readonly description: string;
    readonly displayName: string;
    readonly key: string;
    readonly typeDefinition: ITypeDefinition;

    getValue(model: TModel): string;
    getRandomExampleValue(model: TModel): string;
    setValue(phil: Phil, model: TModel, newValue: string): Promise<boolean>;
}

const NOWRAP = '';
const NEWLINE = '\n';

export abstract class ConfigCommandBase<TModel> implements ICommand {
    public abstract readonly name: string;
    public abstract readonly aliases: ReadonlyArray<string>;
    public abstract readonly feature: Feature;

    public abstract readonly helpGroup: HelpGroup;
    public abstract readonly helpDescription: string;

    public abstract readonly versionAdded: number;

    public readonly isAdminCommand = true;

    protected abstract configurationFor: string;

    private get titleCaseConfigurationFor(): string {
        return this.configurationFor[0].toUpperCase() + this.configurationFor.slice(1).toLowerCase();
    }

    private readonly orderedProperties: ReadonlyArray<IConfigProperty<TModel>>;
    private readonly propertiesLookup: {[key: string]: IConfigProperty<TModel>};

    constructor(properties: ReadonlyArray<IConfigProperty<TModel>>) {
        this.orderedProperties = properties.slice().sort(this.compareConfigProperties);
        this.propertiesLookup = {};
        for (const property of properties) {
            this.propertiesLookup[property.key.toLowerCase()] = property;
        }
    }

    public async processMessage(phil: Phil, message: PublicMessage, commandArgs: ReadonlyArray<string>): Promise<any> {
        const mutableArgs: string[] = [ ...commandArgs ];
        const model = await this.getModel(phil, message, mutableArgs);
        if (!mutableArgs.length) {
            return this.processNoAction(phil, message, model);
        }

        const action = this.determineAction(mutableArgs);
        if (!action) {
            return this.sendUnknownActionResponse(phil, message);
        }

        if (action === Action.Display) {
            return this.processDisplayRequest(phil, message, model);
        }

        return this.processPropertyRequest(phil, message, mutableArgs, model, action);
    }

    protected abstract getModel(phil: Phil, message: PublicMessage, mutableArgs: string[]): Promise<TModel>;

    private compareConfigProperties(a: IConfigProperty<TModel>, b: IConfigProperty<TModel>): number {
        const aKey = a.displayName.toUpperCase();
        const bKey = b.displayName.toUpperCase();
        if (aKey === bKey) {
            return 0;
        }

        return (aKey < bKey ? -1 : 1);
    }

    private async processNoAction(phil: Phil, message: PublicMessage, model: TModel): Promise<any> {
        const response = `This is the command for changing ${this.configurationFor} configuration. ${
            NOWRAP}Within this command, there are numerous actions you can take to allow you to ${
            NOWRAP}understand Phil, his configuration, and how you can make him fit your server's ${
            NOWRAP}needs.${
            NEWLINE}${
            NEWLINE}${this.getActionsExplanation(message.serverConfig)}`;

        console.log(response.length);
        return DiscordPromises.sendEmbedMessage(phil.bot, message.channelId, {
            color: EmbedColor.Info,
            description: response,
            title: this.titleCaseConfigurationFor + ' Configuration'
        });
    }

    private async processDisplayRequest(phil: Phil, message: PublicMessage, model: TModel): Promise<any> {
        const fields: IEmbedField[] = [];
        for (const property of this.orderedProperties) {
            fields.push(this.getDisplayRequestField(model, property, message.serverConfig));
        }

        return DiscordPromises.sendEmbedMessage(phil.bot, message.channelId, {
            color: EmbedColor.Info,
            fields,
            title: this.titleCaseConfigurationFor + ' Configuration: Overview'
        });
    }

    private getDisplayRequestField(model: TModel, property: IConfigProperty<TModel>, serverConfig: ServerConfig): IEmbedField {
        const currentValue = property.getValue(model);
        const displayValue = property.typeDefinition.toDisplayFormat(currentValue, serverConfig);
        return {
            name: `:small_blue_diamond: ${property.displayName} [key: \`${property.key}\`]`,
            value: displayValue
        };
    }

    private async processPropertyRequest(phil: Phil, message: PublicMessage, mutableArgs: string[],
        model: TModel, action: PropertyAction): Promise<any> {
        const property = this.getSpecifiedProperty(mutableArgs);
        if (!property) {
            return this.sendPropertiesListAsResponse(phil, message);
        }

        if (action === Action.Info) {
            return this.processInfoRequest(phil, message, property, model);
        }

        const newValue = this.getNewValue(phil, message.serverConfig, property, action,
            mutableArgs);
        if (newValue.wasSuccessful === false) {
            return this.sendInvalidInputResponse(phil, message, property, newValue.errorMessage);
        }

        await property.setValue(phil, model, newValue.parsedValue);
        return this.sendMutateSuccessMessage(phil, message, property);
    }

    private async processInfoRequest(phil: Phil, message: PublicMessage, property: IConfigProperty<TModel>, model: TModel): Promise<any> {
        const currentValue = property.getValue(model);
        const displayValue = property.typeDefinition.toDisplayFormat(currentValue, message.serverConfig);
        const displayDefaultValue = property.typeDefinition.toDisplayFormat(property.defaultValue, message.serverConfig);
        let response = `${property.description}${
            NEWLINE}${
            NEWLINE}Current Value: **${displayValue}**${
            NEWLINE}Default Value: ${displayDefaultValue}${
            NEWLINE}${
            NEWLINE}**RULES**${this.getPropertyRulesDisplayList(property)}`;


        const randomExample = property.getRandomExampleValue(model);
        const randomDisplayValue = property.typeDefinition.toMultilineCodeblockDisplayFormat(randomExample, message.serverConfig);
        response += `${
            NEWLINE}**EXAMPLES**${
            NEWLINE}\`\`\`${message.serverConfig.commandPrefix}${this.name} ${Action.Set} ${
            property.key} ${randomDisplayValue}${
            NEWLINE}${message.serverConfig.commandPrefix}${this.name} ${Action.Clear} ${
            property.key}\`\`\``;

        return DiscordPromises.sendEmbedMessage(phil.bot, message.channelId, {
            color: EmbedColor.Info,
            description: response,
            title: `${this.titleCaseConfigurationFor} Configuration: ${property.displayName}`
        });
    }

    private determineAction(mutableArgs: string[]): Action | undefined {
        let verb = mutableArgs.shift();
        if (!verb) {
            return undefined;
        }

        verb = verb.toLowerCase();
        return ActionVerbs[verb];
    }

    private async sendUnknownActionResponse(phil: Phil, message: PublicMessage): Promise<any> {
        const response = `You attempted to use an unrecognized action with this command.${
            NEWLINE}${
            NEWLINE}${this.getActionsExplanation(message.serverConfig)}`;

        return DiscordPromises.sendEmbedMessage(phil.bot, message.channelId, {
            color: EmbedColor.Error,
            description: response,
            title: `${this.titleCaseConfigurationFor} Configuration: Unknown action`
        });
    }

    private getSpecifiedProperty(mutableArgs: string[]): IConfigProperty<TModel> {
        let specifiedKey = mutableArgs.shift();
        if (!specifiedKey) {
            return null;
        }

        specifiedKey = specifiedKey.toLowerCase();
        return this.propertiesLookup[specifiedKey];
    }

    private async sendPropertiesListAsResponse(phil: Phil, message: PublicMessage): Promise<any> {
        return DiscordPromises.sendMessage(phil.bot, message.channelId, 'TODO: Properties'); // TODO
    }

    private getNewValue(phil: Phil, serverConfig: ServerConfig, property: IConfigProperty<TModel>, action: MutatingPropertyAction, mutableArgs: string[]): ParseResult {
        if (action === Action.Clear) {
            return {
                parsedValue: property.defaultValue,
                wasSuccessful: true
            };
        }

        const rawInput = mutableArgs.shift();
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

        const validityResult = property.typeDefinition.isValid(result.parsedValue, phil, serverConfig);
        if (validityResult.isValid === false) {
            return {
                errorMessage: validityResult.errorMessage,
                wasSuccessful: false
            };
        }

        return result;
    }

    private async sendInvalidInputResponse(phil: Phil, message: PublicMessage, property: IConfigProperty<TModel>, errorMessage: string): Promise<any> {
        const response = `The value you attempted to set the ${property.displayName} property to ${
            NOWRAP}is invalid.${
            NEWLINE}${
            NEWLINE}**${errorMessage}**${
            NEWLINE}${
            NEWLINE}Proper values for the ${property.displayName} property must obey the ${
            NOWRAP}following rules:${this.getPropertyRulesDisplayList(property)}${
            NEWLINE}${
            NEWLINE}To learn more about this property, including viewing example values you can ${
            NOWRAP}use for your server, use the command \`${message.serverConfig.commandPrefix}${
            this.name} ${Action.Info} ${property.key}\`.`;

        return DiscordPromises.sendEmbedMessage(phil.bot, message.channelId, {
            color: EmbedColor.Error,
            description: response,
            title: `${property.displayName}: Invalid Input`
        });
    }

    private async sendMutateSuccessMessage(phil: Phil, message: PublicMessage, property: IConfigProperty<TModel>,): Promise<any> {
        return DiscordPromises.sendMessage(phil.bot, message.channelId, 'TODO: Success'); // TODO
    }

    private getActionsExplanation(serverConfig: ServerConfig): string {
        const demoProp = BotUtils.getRandomArrayEntry(this.orderedProperties);
        return `**ACTIONS**${
            NEWLINE}The various actions that you can take with \`${
            serverConfig.commandPrefix}${this.name}\` are as follows:\`\`\`${
            NEWLINE}● [${Action.Display}] - view all of the configuration properties at a glance;${
            NEWLINE}● [${Action.Info}] - see detailed information about a configuration property ${
            NOWRAP}as well its current value;${
            NEWLINE}● [${Action.Clear}] - resets the value of the property to Phil's default for ${
            NOWRAP}that property;${
            NEWLINE}● [${Action.Set}] - sets the value of the property to a valid value of your ${
            NOWRAP}choosing.${
            NEWLINE}\`\`\`${
            NEWLINE}**USAGE**${
            NEWLINE}Using this command is a matter of combining an action and a property ${
            NOWRAP} (if appropriate), like so:${
            NEWLINE}\`\`\`${serverConfig.commandPrefix}${this.name} display${
            NEWLINE}${serverConfig.commandPrefix}${this.name} ${Action.Info} ${demoProp.key}${
            NEWLINE}${serverConfig.commandPrefix}${this.name} ${Action.Clear} ${demoProp.key}${
            NEWLINE}${serverConfig.commandPrefix}${this.name} ${Action.Set} ${demoProp.key} ${
            demoProp.defaultValue}\`\`\`As you can see from the above examples, the action (eg ${
            NOWRAP}**${Action.Info}**) comes before the property key (eg **${demoProp.key}**). All actions ${
            NOWRAP}require a property key except for **${Action.Display}**, since it shows all properties.${
            NEWLINE}${
            NEWLINE}It is in the special case of the **${Action.Set}** action that you need to provide an ${
            NOWRAP}extra final piece of information at the end: the desired new value. You can ${
            NOWRAP}use the **${Action.Info}** action to see rules for what a valid value should look like ${
            NOWRAP}and what the property does, in order to understand what to change the value to.`;
    }

    private getPropertyRulesDisplayList(property: IConfigProperty<TModel>): string {
        let response = '```';
        for (const rule of property.typeDefinition.rules) {
            response += `● ${rule}\n`;
        }

        response += '```';
        return response;
    }
}
