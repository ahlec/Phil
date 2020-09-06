import CommandInvocation from '@phil/CommandInvocation';
import { HelpGroup } from '@phil/help-groups';
import PermissionLevel from '@phil/permission-level';
import Phil from '@phil/phil';
import { EmbedField } from '@phil/promises/discord';
import ServerConfig from '@phil/server-config';
import { TypeDefinition } from '@phil/type-definition/@type-definition';
import { getRandomArrayEntry } from '@phil/utils';
import Command, { LoggerDefinition } from '@phil/commands/@types';
import {
  ConfigAction,
  ConfigActionParameterType,
} from './config-actions/@action';
import Database from '@phil/database';

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

  public async invoke(
    invocation: CommandInvocation,
    database: Database,
    legacyPhil: Phil
  ): Promise<void> {
    const mutableArgs: string[] = [...invocation.commandArgs];
    const model = await this.getModel(invocation);
    if (!mutableArgs.length) {
      await this.processNoAction(legacyPhil, invocation, model);
      return;
    }

    const action = this.determineAction(mutableArgs);
    if (!action) {
      await this.sendUnknownActionResponse(legacyPhil, invocation, model);
      return;
    }

    await this.processAction(
      legacyPhil,
      invocation,
      mutableArgs,
      model,
      action
    );
  }

  public getPropertyRulesDisplayList(property: ConfigProperty<TModel>): string {
    let response = '```';
    for (const rule of property.typeDefinition.rules) {
      response += `● ${rule}\n`;
    }

    response += '```';
    return response;
  }

  protected abstract getModel(invocation: CommandInvocation): Promise<TModel>;

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
    legacyPhil: Phil,
    invocation: CommandInvocation,
    model: TModel
  ): Promise<void> {
    const response = `This is the command for changing ${
      this.configurationFor
    } configuration. ${NOWRAP}Within this command, there are numerous actions you can take to allow you to ${NOWRAP}understand Phil, his configuration, and how you can make him fit your server's ${NOWRAP}needs.${NEWLINE}${NEWLINE}${this.getActionsExplanation(
      legacyPhil,
      invocation.context.serverConfig,
      model
    )}`;

    await invocation.respond({
      color: 'powder-blue',
      description: response,
      fields: null,
      footer: null,
      title: this.titleCaseConfigurationFor + ' Configuration',
      type: 'embed',
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
    invocation: CommandInvocation,
    model: TModel
  ): Promise<void> {
    const response = `You attempted to use an unrecognized action with this command.${NEWLINE}${NEWLINE}${this.getActionsExplanation(
      phil,
      invocation.context.serverConfig,
      model
    )}`;

    await invocation.respond({
      color: 'red',
      description: response,
      fields: null,
      footer: null,
      title: `${this.titleCaseConfigurationFor} Configuration: Unknown action`,
      type: 'embed',
    });
  }

  private async processAction(
    phil: Phil,
    invocation: CommandInvocation,
    mutableArgs: string[],
    model: TModel,
    action: ConfigAction<TModel>
  ): Promise<void> {
    let property: ConfigProperty<TModel> | null = null;
    if (action.isPropertyRequired) {
      property = this.getSpecifiedProperty(mutableArgs);
      if (!property) {
        await this.sendUnknownPropertyResponse(phil, invocation, action, model);
        return;
      }
    }

    await action.process(this, phil, invocation, mutableArgs, property, model);
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
    invocation: CommandInvocation,
    action: ConfigAction<TModel>,
    model: TModel
  ): Promise<void> {
    const response = `You attempted to use an unknown property with the **${action.primaryKey}** action.${NEWLINE}${NEWLINE}**PROPERTIES**${NEWLINE}The following are all of the properties that are recognized with the ${invocation.context.serverConfig.commandPrefix}${this.name} command:`;

    const fields: EmbedField[] = [];
    for (const property of this.orderedProperties) {
      const exampleUse = this.createActionExampleUse(
        phil,
        invocation.context.serverConfig,
        action,
        property,
        model
      );
      fields.push({
        name: `**${property.displayName}** [key: ${property.key}]`,
        value: `\`${exampleUse}\``,
      });
    }

    await invocation.respond({
      color: 'red',
      description: response,
      fields,
      footer: null,
      title: `${this.titleCaseConfigurationFor} Configuration: Unknown property`,
      type: 'embed',
    });
  }

  private getActionsExplanation(
    legacyPhil: Phil,
    serverConfig: ServerConfig,
    model: TModel
  ): string {
    const demoProp = getRandomArrayEntry(this.orderedProperties);
    let explanation = `**ACTIONS**${NEWLINE}The various actions that you can take with \`${serverConfig.commandPrefix}${this.name}\` are as follows:\`\`\``;
    const usageExamples: string[] = [];
    let specialUsageNotes = '';

    for (let index = 0; index < this.orderedActions.length; ++index) {
      const action = this.orderedActions[index];
      let lineEnd = ';\n';
      if (index === this.orderedActions.length - 1) {
        lineEnd = '.';
      }

      explanation += `● [${action.primaryKey}] - ${action.description}${lineEnd}`;

      usageExamples.push(
        this.createActionExampleUse(
          legacyPhil,
          serverConfig,
          action,
          demoProp,
          model
        )
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
      demoActionRequiringProperty = getRandomArrayEntry(this.orderedActions);
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
    legacyPhil: Phil,
    serverConfig: ServerConfig,
    action: ConfigAction<TModel>,
    demoProperty: ConfigProperty<TModel>,
    model: TModel
  ): string {
    let example = `${serverConfig.commandPrefix}${this.name} ${action.primaryKey}`;

    for (const parameter of action.parameters) {
      example += ' ';
      example += this.getActionParameterExampleValue(
        legacyPhil,
        serverConfig,
        parameter,
        demoProperty,
        model
      );
    }

    return example;
  }

  private getActionParameterExampleValue(
    legacyPhil: Phil,
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
          legacyPhil,
          serverConfig
        );
      }
    }

    return parameterType;
  }
}
