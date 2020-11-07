import { EmbedField } from '@phil/discord/MessageTemplate';
import Server from '@phil/discord/Server';

import CommandInvocation from '@phil/CommandInvocation';
import { HelpGroup } from '@phil/help-groups';
import PermissionLevel from '@phil/permission-level';
import { TypeDefinition } from '@phil/type-definition/@type-definition';
import { getRandomArrayEntry } from '@phil/utils';
import Command, { LoggerDefinition } from '@phil/commands/@types';
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
  getRandomExampleValue(server: Server): string | Promise<string>;
  setValue(model: TModel, newValue: string | null): Promise<boolean>;
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

  public async invoke(invocation: CommandInvocation): Promise<void> {
    const mutableArgs: string[] = [...invocation.commandArgs];
    const model = await this.getModel(invocation);
    if (!mutableArgs.length) {
      await this.processNoAction(invocation);
      return;
    }

    const action = this.determineAction(mutableArgs);
    if (!action) {
      await this.sendUnknownActionResponse(invocation);
      return;
    }

    await this.processAction(invocation, mutableArgs, model, action);
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

  private async processNoAction(invocation: CommandInvocation): Promise<void> {
    const explanation = await this.getActionsExplanation(invocation);

    const response = `This is the command for changing ${this.configurationFor} configuration. ${NOWRAP}Within this command, there are numerous actions you can take to allow you to ${NOWRAP}understand Phil, his configuration, and how you can make him fit your server's ${NOWRAP}needs.${NEWLINE}${NEWLINE}${explanation}`;

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
    invocation: CommandInvocation
  ): Promise<void> {
    const explanation = await this.getActionsExplanation(invocation);

    const response = `You attempted to use an unrecognized action with this command.${NEWLINE}${NEWLINE}${explanation}`;

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
    invocation: CommandInvocation,
    mutableArgs: string[],
    model: TModel,
    action: ConfigAction<TModel>
  ): Promise<void> {
    let property: ConfigProperty<TModel> | null = null;
    if (action.isPropertyRequired) {
      property = this.getSpecifiedProperty(mutableArgs);
      if (!property) {
        await this.sendUnknownPropertyResponse(invocation, action);
        return;
      }
    }

    await action.process(invocation, this, model, property, mutableArgs);
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
    invocation: CommandInvocation,
    action: ConfigAction<TModel>
  ): Promise<void> {
    const response = `You attempted to use an unknown property with the **${action.primaryKey}** action.${NEWLINE}${NEWLINE}**PROPERTIES**${NEWLINE}The following are all of the properties that are recognized with the ${invocation.context.serverConfig.commandPrefix}${this.name} command:`;

    const fields = await Promise.all(
      this.orderedProperties.map(
        async (property): Promise<EmbedField> => {
          const exampleUse = await this.createActionExampleUse(
            invocation,
            action,
            property
          );

          return {
            name: `**${property.displayName}** [key: ${property.key}]`,
            value: `\`${exampleUse}\``,
          };
        }
      )
    );

    await invocation.respond({
      color: 'red',
      description: response,
      fields,
      footer: null,
      title: `${this.titleCaseConfigurationFor} Configuration: Unknown property`,
      type: 'embed',
    });
  }

  private async getActionsExplanation(
    invocation: CommandInvocation
  ): Promise<string> {
    const demoProp = getRandomArrayEntry(this.orderedProperties);
    let explanation = `**ACTIONS**${NEWLINE}The various actions that you can take with \`${invocation.context.serverConfig.commandPrefix}${this.name}\` are as follows:\`\`\``;

    const actionBreakdowns = await Promise.all(
      this.orderedActions.map(
        async (
          action,
          index,
          { length: totalLength }
        ): Promise<{
          explanation: string;
          specialUsageNotes: string | null;
          usage: string;
        }> => {
          const usage = await this.createActionExampleUse(
            invocation,
            action,
            demoProp
          );
          return {
            // Bulleted list so grammatically, all lines end with semicolon except last
            explanation: `● [${action.primaryKey}] - ${action.description}${
              index === totalLength - 1 ? '.' : ';'
            }`,
            specialUsageNotes: action.specialUsageNotes,
            usage,
          };
        }
      )
    );

    const actionsSection = actionBreakdowns
      .map(({ explanation }) => explanation)
      .join('\n');
    const usageSection = actionBreakdowns.map(({ usage }) => usage).join('\n');
    const specialUsageNotes = actionBreakdowns
      .map(({ specialUsageNotes }) => specialUsageNotes)
      .filter((s): s is string => !!s)
      .join('\n\n');

    let demoActionRequiringProperty: ConfigAction<TModel>;
    do {
      demoActionRequiringProperty = getRandomArrayEntry(this.orderedActions);
    } while (!demoActionRequiringProperty.isPropertyRequired);

    explanation += `${actionsSection}\`\`\`${NEWLINE}**USAGE**${NEWLINE}Using this command is a matter of combining an action and a property ${NOWRAP} (if appropriate), like so:${NEWLINE}\`\`\`${usageSection}\`\`\`As you can see from the above ${NOWRAP}examples, the action (eg **${demoActionRequiringProperty.primaryKey}**) comes ${NOWRAP}before the property key (eg **${demoProp.key}**).`;

    if (specialUsageNotes) {
      explanation += '\n\n' + specialUsageNotes;
    }

    return explanation;
  }

  private async createActionExampleUse(
    invocation: CommandInvocation,
    action: ConfigAction<TModel>,
    demoProperty: ConfigProperty<TModel>
  ): Promise<string> {
    const example = `${invocation.context.serverConfig.commandPrefix}${this.name} ${action.primaryKey}`;

    const exampleValues = await Promise.all(
      action.parameters.map((parameter) =>
        this.getActionParameterExampleValue(invocation, parameter, demoProperty)
      )
    );

    return `${example} ${exampleValues.join(' ')}`;
  }

  private async getActionParameterExampleValue(
    invocation: CommandInvocation,
    parameterType: ConfigActionParameterType,
    demoProperty: ConfigProperty<TModel>
  ): Promise<string> {
    switch (parameterType) {
      case ConfigActionParameterType.PropertyKey: {
        return demoProperty.key;
      }
      case ConfigActionParameterType.NewPropertyValue: {
        const randomValue = await demoProperty.getRandomExampleValue(
          invocation.context.server
        );
        const {
          multilineCodeBlock: formattedValue,
        } = await demoProperty.typeDefinition.format(
          randomValue,
          invocation.context.server
        );
        return formattedValue;
      }
    }
  }
}
