import EmbedColor from '../../embed-color';
import { HelpGroup } from '../../help-groups';
import PublicMessage from '../../messages/public';
import PermissionLevel from '../../permission-level';
import Phil from '../../phil';
import { DiscordPromises, EmbedField } from '../../promises/discord';
import ServerConfig from '../../server-config';
import { TypeDefinition } from '../../type-definition/@type-definition';
import BotUtils from '../../utils';
import Command, { LoggerDefinition } from '../@types';
import {
  ConfigAction,
  ConfigActionParameterType,
} from './config-actions/@action';

export interface ConfigProperty<TModel> {
  readonly defaultValue: string | null;
  readonly description: string;
  readonly displayName: string;
  readonly key: string;
  readonly typeDefinition: TypeDefinition;

  getValue(model: TModel): string | null;
  getRandomExampleValue(model: TModel): string;
  setValue(
    phil: Phil,
    model: TModel,
    newValue: string | null
  ): Promise<boolean>;
}

const NOWRAP = '';
const NEWLINE = '\n';

interface ConfigCommandBaseDetails<TModel> {
  configurationFor: string;
  helpDescription: string;
  orderedActions: ReadonlyArray<ConfigAction<TModel>>;
  properties: ReadonlyArray<ConfigProperty<TModel>>;
  versionAdded: number;
}

export abstract class ConfigCommandBase<TModel> extends Command {
  public readonly orderedActions: ReadonlyArray<ConfigAction<TModel>>;
  public readonly orderedProperties: ReadonlyArray<ConfigProperty<TModel>>;

  private readonly configurationFor: string;
  private readonly actionsLookup: { [verb: string]: ConfigAction<TModel> };
  private readonly propertiesLookup: { [key: string]: ConfigProperty<TModel> };

  protected constructor(
    name: string,
    parentDefinition: LoggerDefinition,
    details: ConfigCommandBaseDetails<TModel>
  ) {
    super(name, parentDefinition, {
      helpDescription: details.helpDescription,
      helpGroup: HelpGroup.Admin,
      permissionLevel: PermissionLevel.AdminOnly,
      versionAdded: details.versionAdded,
    });

    this.orderedActions = details.orderedActions;
    this.configurationFor = details.configurationFor;

    this.actionsLookup = {};
    for (const action of details.orderedActions) {
      this.actionsLookup[action.primaryKey] = action;

      for (const alias of action.aliases) {
        this.actionsLookup[alias] = action;
      }
    }

    this.orderedProperties = details.properties
      .slice()
      .sort(this.compareConfigProperties);
    this.propertiesLookup = {};
    for (const property of details.properties) {
      this.propertiesLookup[property.key.toLowerCase()] = property;
    }
  }

  public get titleCaseConfigurationFor(): string {
    return (
      this.configurationFor[0].toUpperCase() +
      this.configurationFor.slice(1).toLowerCase()
    );
  }

  public async processMessage(
    phil: Phil,
    message: PublicMessage,
    commandArgs: ReadonlyArray<string>
  ): Promise<any> {
    const mutableArgs: string[] = [...commandArgs];
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

  public getPropertyRulesDisplayList(property: ConfigProperty<TModel>): string {
    let response = '```';
    for (const rule of property.typeDefinition.rules) {
      response += `● ${rule}\n`;
    }

    response += '```';
    return response;
  }

  protected abstract getModel(
    phil: Phil,
    message: PublicMessage,
    mutableArgs: string[]
  ): Promise<TModel>;

  private compareConfigProperties(
    a: ConfigProperty<TModel>,
    b: ConfigProperty<TModel>
  ): number {
    const aKey = a.displayName.toUpperCase();
    const bKey = b.displayName.toUpperCase();
    if (aKey === bKey) {
      return 0;
    }

    return aKey < bKey ? -1 : 1;
  }

  private async processNoAction(
    phil: Phil,
    message: PublicMessage,
    model: TModel
  ): Promise<any> {
    const response = `This is the command for changing ${
      this.configurationFor
    } configuration. ${NOWRAP}Within this command, there are numerous actions you can take to allow you to ${NOWRAP}understand Phil, his configuration, and how you can make him fit your server's ${NOWRAP}needs.${NEWLINE}${NEWLINE}${this.getActionsExplanation(
      phil,
      message.serverConfig,
      model
    )}`;

    return DiscordPromises.sendEmbedMessage(phil.bot, message.channelId, {
      color: EmbedColor.Info,
      description: response,
      title: this.titleCaseConfigurationFor + ' Configuration',
    });
  }

  private determineAction(mutableArgs: string[]): ConfigAction<TModel> | null {
    let verb = mutableArgs.shift();
    if (!verb) {
      return null;
    }

    verb = verb.toLowerCase();
    return this.actionsLookup[verb];
  }

  private async sendUnknownActionResponse(
    phil: Phil,
    message: PublicMessage,
    model: TModel
  ): Promise<any> {
    const response = `You attempted to use an unrecognized action with this command.${NEWLINE}${NEWLINE}${this.getActionsExplanation(
      phil,
      message.serverConfig,
      model
    )}`;

    return DiscordPromises.sendEmbedMessage(phil.bot, message.channelId, {
      color: EmbedColor.Error,
      description: response,
      title: `${this.titleCaseConfigurationFor} Configuration: Unknown action`,
    });
  }

  private async processAction(
    phil: Phil,
    message: PublicMessage,
    mutableArgs: string[],
    model: TModel,
    action: ConfigAction<TModel>
  ): Promise<any> {
    let property: ConfigProperty<TModel> | null = null;
    if (action.isPropertyRequired) {
      property = this.getSpecifiedProperty(mutableArgs);
      if (!property) {
        return this.sendUnknownPropertyResponse(phil, message, action, model);
      }
    }

    return action.process(this, phil, message, mutableArgs, property, model);
  }

  private getSpecifiedProperty(
    mutableArgs: string[]
  ): ConfigProperty<TModel> | null {
    let specifiedKey = mutableArgs.shift();
    if (!specifiedKey) {
      return null;
    }

    specifiedKey = specifiedKey.toLowerCase();
    return this.propertiesLookup[specifiedKey];
  }

  private async sendUnknownPropertyResponse(
    phil: Phil,
    message: PublicMessage,
    action: ConfigAction<TModel>,
    model: TModel
  ): Promise<any> {
    const response = `You attempted to use an unknown property with the **${
      action.primaryKey
    }** action.${NEWLINE}${NEWLINE}**PROPERTIES**${NEWLINE}The following are all of the properties that are recognized with the ${
      message.serverConfig.commandPrefix
    }${this.name} command:`;

    const fields: EmbedField[] = [];
    for (const property of this.orderedProperties) {
      const exampleUse = this.createActionExampleUse(
        phil,
        message.serverConfig,
        action,
        property,
        model
      );
      fields.push({
        name: `**${property.displayName}** [key: ${property.key}]`,
        value: `\`${exampleUse}\``,
      });
    }

    return DiscordPromises.sendEmbedMessage(phil.bot, message.channelId, {
      color: EmbedColor.Error,
      description: response,
      fields,
      title: `${
        this.titleCaseConfigurationFor
      } Configuration: Unknown property`,
    });
  }

  private getActionsExplanation(
    phil: Phil,
    serverConfig: ServerConfig,
    model: TModel
  ): string {
    const demoProp = BotUtils.getRandomArrayEntry(this.orderedProperties);
    let explanation = `**ACTIONS**${NEWLINE}The various actions that you can take with \`${
      serverConfig.commandPrefix
    }${this.name}\` are as follows:\`\`\``;
    const usageExamples: string[] = [];
    let specialUsageNotes = '';

    for (let index = 0; index < this.orderedActions.length; ++index) {
      const action = this.orderedActions[index];
      let lineEnd = ';\n';
      if (index === this.orderedActions.length - 1) {
        lineEnd = '.';
      }

      explanation += `● [${action.primaryKey}] - ${
        action.description
      }${lineEnd}`;

      usageExamples.push(
        this.createActionExampleUse(phil, serverConfig, action, demoProp, model)
      );

      if (action.specialUsageNotes) {
        if (specialUsageNotes) {
          specialUsageNotes += '\n\n';
        }

        specialUsageNotes += action.specialUsageNotes;
      }
    }

    let demoActionRequiringProperty: ConfigAction<TModel>;
    do {
      demoActionRequiringProperty = BotUtils.getRandomArrayEntry(
        this.orderedActions
      );
    } while (!demoActionRequiringProperty.isPropertyRequired);

    explanation += `\`\`\`${NEWLINE}**USAGE**${NEWLINE}Using this command is a matter of combining an action and a property ${NOWRAP} (if appropriate), like so:${NEWLINE}\`\`\`${usageExamples.join(
      '\n'
    )}\`\`\`As you can see from the above ${NOWRAP}examples, the action (eg **${
      demoActionRequiringProperty.primaryKey
    }**) comes ${NOWRAP}before the property key (eg **${demoProp.key}**).`;

    if (specialUsageNotes) {
      explanation += '\n\n' + specialUsageNotes;
    }

    return explanation;
  }

  private createActionExampleUse(
    phil: Phil,
    serverConfig: ServerConfig,
    action: ConfigAction<TModel>,
    demoProperty: ConfigProperty<TModel>,
    model: TModel
  ): string {
    let example = `${serverConfig.commandPrefix}${this.name} ${
      action.primaryKey
    }`;

    for (const parameter of action.parameters) {
      example += ' ';
      example += this.getActionParameterExampleValue(
        phil,
        serverConfig,
        parameter,
        demoProperty,
        model
      );
    }

    return example;
  }

  private getActionParameterExampleValue(
    phil: Phil,
    serverConfig: ServerConfig,
    parameterType: ConfigActionParameterType,
    demoProperty: ConfigProperty<TModel>,
    model: TModel
  ): string {
    switch (parameterType) {
      case ConfigActionParameterType.PropertyKey:
        return demoProperty.key;
      case ConfigActionParameterType.NewPropertyValue: {
        const randomValue = demoProperty.getRandomExampleValue(model);
        return demoProperty.typeDefinition.toMultilineCodeblockDisplayFormat(
          randomValue,
          phil,
          serverConfig
        );
      }
    }

    return parameterType;
  }
}
