import Feature from '../../features/feature';
import { HelpGroup } from '../../help-groups';
import PublicMessage from '../../messages/public';
import Phil from '../../phil';
import { DiscordPromises } from '../../promises/discord';
import ServerConfig from '../../server-config';
import { IValueInterpreter, ParseResult } from '../../value-interpreters/@value-interpreter';
import ICommand from '../@types';

enum PropertyInteraction {
    Set = 1,
    Clear = 2,
    Explain = 3
}

const PropertyVerbs: { [verb: string]: PropertyInteraction } = {
    'clear': PropertyInteraction.Clear,
    'explain': PropertyInteraction.Explain,
    'help': PropertyInteraction.Explain,
    'reset': PropertyInteraction.Clear,
    'set': PropertyInteraction.Set
};

export interface IConfigProperty<TModel> {
    readonly defaultValue: string;
    readonly displayName: string;
    readonly isClearable: boolean;
    readonly key: string;
    readonly valueInterpreter: IValueInterpreter;

    getValue(model: TModel): string;
    setValue(phil: Phil, model: TModel, newValue: string): Promise<boolean>;
}

// NOTE (while undocumented):
// Format goes like:
//    p!command [set/clear/explain] [property key] [new value, if set]

export abstract class ConfigCommandBase<TModel> implements ICommand {
    public abstract readonly name: string;
    public abstract readonly aliases: ReadonlyArray<string>;
    public abstract readonly feature: Feature;

    public abstract readonly helpGroup: HelpGroup;
    public abstract readonly helpDescription: string;

    public abstract readonly versionAdded: number;

    public readonly isAdminCommand = true;

    private readonly propertiesLookup: {[key: string]: IConfigProperty<TModel>};

    constructor(properties: ReadonlyArray<IConfigProperty<TModel>>) {
        this.propertiesLookup = {};
        for (const property of properties) {
            this.propertiesLookup[property.key.toLowerCase()] = property;
        }
    }

    public async processMessage(phil: Phil, message: PublicMessage, commandArgs: ReadonlyArray<string>): Promise<any> {
        const mutableArgs: string[] = [ ...commandArgs ];
        const model = await this.getModel(phil, message, mutableArgs);
        if (!mutableArgs.length) {
            return this.processDisplayRequest(phil, message, model);
        }

        return this.processPropertyRequest(phil, message, mutableArgs, model);
    }

    protected abstract getModel(phil: Phil, message: PublicMessage, mutableArgs: string[]): Promise<TModel>;

    private async processDisplayRequest(phil: Phil, message: PublicMessage, model: TModel): Promise<any> {
        return DiscordPromises.sendMessage(phil.bot, message.channelId, 'TODO: Display'); // TODO
    }

    private async processPropertyRequest(phil: Phil, message: PublicMessage, mutableArgs: string[], model: TModel): Promise<any> {
        const interactionType = this.determineInteractionType(mutableArgs);
        if (!interactionType) {
            return this.sendUnknownInteractionResponse(phil, message);
        }

        const property = this.getSpecifiedProperty(mutableArgs);
        if (!property) {
            return this.sendPropertiesListAsResponse(phil, message);
        }

        if (interactionType === PropertyInteraction.Explain) {
            return this.processExplainRequest(phil, message, property);
        }

        const newValue = this.getNewValue(phil, message.serverConfig, property, interactionType,
            mutableArgs);
        if (newValue.wasSuccessful === false) {
            return this.sendInvalidInputResponse(phil, message, newValue.errorMessage);
        }

        await property.setValue(phil, model, newValue.parsedValue);
        return this.sendMutateSuccessMessage(phil, message);
    }

    private async processExplainRequest(phil: Phil, message: PublicMessage, property: IConfigProperty<TModel>): Promise<any> {
        return DiscordPromises.sendMessage(phil.bot, message.channelId, 'TODO: Help'); // TODO
    }

    private determineInteractionType(mutableArgs: string[]): PropertyInteraction | null {
        let verb = mutableArgs.shift();
        if (!verb) {
            return null;
        }

        verb = verb.toLowerCase();
        const interactionType = PropertyVerbs[verb];
        if (!interactionType) {
            return null;
        }

        return interactionType;
    }

    private async sendUnknownInteractionResponse(phil: Phil, message: PublicMessage): Promise<any> {
        return DiscordPromises.sendMessage(phil.bot, message.channelId, 'TODO: Unknown interaction'); // TODO
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

    private getNewValue(phil: Phil, serverConfig: ServerConfig, property: IConfigProperty<TModel>, interactionType: PropertyInteraction.Clear | PropertyInteraction.Set, mutableArgs: string[]): ParseResult {
        if (interactionType === PropertyInteraction.Clear) {
            if (!property.isClearable) {
                return {
                    errorMessage: 'This property cannot be cleared.',
                    wasSuccessful: false
                };
            }

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

        const result = property.valueInterpreter.tryParse(rawInput, phil, serverConfig);
        if (result.wasSuccessful === false) {
            return result;
        }

        if (!property.valueInterpreter.isValid(result.parsedValue, phil, serverConfig)) {
            return {
                errorMessage: 'The value provided is invalid for use on the server.',
                wasSuccessful: false
            };
        }

        return result;
    }

    private async sendInvalidInputResponse(phil: Phil, message: PublicMessage, errorMessage: string): Promise<any> {
        return DiscordPromises.sendMessage(phil.bot, message.channelId, 'TODO: Invalid input'); // TODO
    }

    private async sendMutateSuccessMessage(phil: Phil, message: PublicMessage): Promise<any> {
        return DiscordPromises.sendMessage(phil.bot, message.channelId, 'TODO: Success'); // TODO
    }
}
