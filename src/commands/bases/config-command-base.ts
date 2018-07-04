import EmbedColor from '../../embed-color';
import Feature from '../../features/feature';
import { HelpGroup } from '../../help-groups';
import PublicMessage from '../../messages/public';
import Phil from '../../phil';
import { DiscordPromises } from '../../promises/discord';
import ServerConfig from '../../server-config';
import { ITypeDefinition } from '../../type-definition/@type-definition';
import BotUtils from '../../utils';
import ICommand from '../@types';
import { ConfigActionParameterType, IConfigAction } from './config-actions/@action';

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

function NEVER(x: never) {
    throw new Error('Should not be here -- switch case not handled.');
}

export abstract class ConfigCommandBase<TModel> implements ICommand {
    public abstract readonly name: string;
    public abstract readonly aliases: ReadonlyArray<string>;
    public abstract readonly feature: Feature;

    public abstract readonly helpGroup: HelpGroup;
    public abstract readonly helpDescription: string;

    public abstract readonly versionAdded: number;

    public readonly isAdminCommand = true;

    public readonly orderedProperties: ReadonlyArray<IConfigProperty<TModel>>;
    public get titleCaseConfigurationFor(): string {
        return this.configurationFor[0].toUpperCase() + this.configurationFor.slice(1).toLowerCase();
    }

    protected abstract configurationFor: string;

    private readonly actionsLookup: {[verb: string]: IConfigAction<TModel>};
    private readonly propertiesLookup: {[key: string]: IConfigProperty<TModel>};

    constructor(public readonly orderedActions: ReadonlyArray<IConfigAction<TModel>>,
      properties: ReadonlyArray<IConfigProperty<TModel>>) {
        this.actionsLookup = {};
        for (const action of orderedActions) {
            this.actionsLookup[action.primaryKey] = action;

            for (const alias of action.aliases) {
                this.actionsLookup[alias] = action;
            }
        }

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
            return this.sendUnknownActionResponse(phil, message, model);
        }

        return this.processAction(phil, message, mutableArgs, model, action);
    }

    public getPropertyRulesDisplayList(property: IConfigProperty<TModel>): string {
        let response = '```';
        for (const rule of property.typeDefinition.rules) {
            response += `● ${rule}\n`;
        }

        response += '```';
        return response;
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
            NEWLINE}${this.getActionsExplanation(message.serverConfig, model)}`;

        console.log(response.length);
        return DiscordPromises.sendEmbedMessage(phil.bot, message.channelId, {
            color: EmbedColor.Info,
            description: response,
            title: this.titleCaseConfigurationFor + ' Configuration'
        });
    }

    private determineAction(mutableArgs: string[]): IConfigAction<TModel> {
        let verb = mutableArgs.shift();
        if (!verb) {
            return undefined;
        }

        verb = verb.toLowerCase();
        return this.actionsLookup[verb];
    }

    private async sendUnknownActionResponse(phil: Phil, message: PublicMessage,
        model: TModel): Promise<any> {
        const response = `You attempted to use an unrecognized action with this command.${
            NEWLINE}${
            NEWLINE}${this.getActionsExplanation(message.serverConfig, model)}`;

        return DiscordPromises.sendEmbedMessage(phil.bot, message.channelId, {
            color: EmbedColor.Error,
            description: response,
            title: `${this.titleCaseConfigurationFor} Configuration: Unknown action`
        });
    }

    private async processAction(phil: Phil, message: PublicMessage, mutableArgs: string[],
        model: TModel, action: IConfigAction<TModel>): Promise<any> {
        let property: IConfigProperty<TModel>;
        if (action.isPropertyRequired) {
            property = this.getSpecifiedProperty(mutableArgs);
            if (!property) {
                return this.sendPropertiesListAsResponse(phil, message);
            }
        }

        return action.process(this, phil, message, mutableArgs, property, model);
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

    private getActionsExplanation(serverConfig: ServerConfig, model: TModel): string {
        const demoProp = BotUtils.getRandomArrayEntry(this.orderedProperties);
        let explanation = `**ACTIONS**${
            NEWLINE}The various actions that you can take with \`${
            serverConfig.commandPrefix}${this.name}\` are as follows:\`\`\``;
        const usageExamples: string[] = [];
        let specialUsageNotes = '';

        for (let index = 0; index < this.orderedActions.length; ++index) {
            const action = this.orderedActions[index];
            let lineEnd = ';\n';
            if (index === this.orderedActions.length - 1) {
                lineEnd = '.';
            }

            explanation += `● [${action.primaryKey}] - ${action.description}${lineEnd}`;

            usageExamples.push(this.createActionExampleUse(serverConfig, action, demoProp, model));

            if (action.specialUsageNotes) {
                if (specialUsageNotes) {
                    specialUsageNotes += '\n\n';
                }

                specialUsageNotes += action.specialUsageNotes;
            }
        }

        let demoActionRequiringProperty: IConfigAction<TModel>;
        do {
            demoActionRequiringProperty = BotUtils.getRandomArrayEntry(this.orderedActions);
        } while(!demoActionRequiringProperty.isPropertyRequired);

        explanation += `\`\`\`${
            NEWLINE}**USAGE**${
            NEWLINE}Using this command is a matter of combining an action and a property ${
            NOWRAP} (if appropriate), like so:${
            NEWLINE}\`\`\`${usageExamples.join('\n')}\`\`\`As you can see from the above ${
            NOWRAP}examples, the action (eg **${demoActionRequiringProperty.primaryKey}**) comes ${
            NOWRAP}before the property key (eg **${demoProp.key}**).`;

        if (specialUsageNotes) {
            explanation += '\n\n' + specialUsageNotes;
        }

        return explanation;
    }

    private createActionExampleUse(serverConfig: ServerConfig,
        action: IConfigAction<TModel>, demoProperty: IConfigProperty<TModel>,
        model: TModel): string {
        let example = `${serverConfig.commandPrefix}${this.name} ${action.primaryKey}`;

        for (const parameter of action.parameters) {
            example += ' ';
            example += this.getActionParameterExampleValue(serverConfig, parameter, demoProperty,
                model);
        }

        return example;
    }

    private getActionParameterExampleValue(serverConfig: ServerConfig,
        parameterType: ConfigActionParameterType, demoProperty: IConfigProperty<TModel>,
        model: TModel): string {
            switch (parameterType) {
                case ConfigActionParameterType.PropertyKey:
                    return demoProperty.key;
                case ConfigActionParameterType.NewPropertyValue: {
                    const randomValue = demoProperty.getRandomExampleValue(model);
                    return demoProperty.typeDefinition
                        .toMultilineCodeblockDisplayFormat(randomValue, serverConfig);
                }
            }

            NEVER(parameterType);
        }
}
