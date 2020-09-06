import CommandInvocation from '@phil/CommandInvocation';
import Database from '@phil/database';
import AllFeatures from '@phil/features/all-features';
import Feature from '@phil/features/feature';
import { HelpGroup } from '@phil/help-groups';
import PermissionLevel from '@phil/permission-level';
import Command, { LoggerDefinition } from '@phil/commands/@types';

const FEATURES_LIST = Object.values(AllFeatures);

interface EnableDisableCommandBaseDetails {
  helpDescription: string;
  shouldEnableFeature: boolean;
}

abstract class EnableDisableCommandBase extends Command {
  private readonly shouldEnableFeature: boolean;

  protected constructor(
    name: string,
    parentDefinition: LoggerDefinition,
    details: EnableDisableCommandBaseDetails
  ) {
    super(name, parentDefinition, {
      helpDescription: details.helpDescription,
      helpGroup: HelpGroup.Admin,
      permissionLevel: PermissionLevel.AdminOnly,
      versionAdded: 9,
    });

    this.shouldEnableFeature = details.shouldEnableFeature;
  }

  public async invoke(
    invocation: CommandInvocation,
    database: Database
  ): Promise<void> {
    if (invocation.commandArgs.length < 1) {
      const errorMessage = this.formatParameterErrorMessage(
        `You must specify one of the features listed below when using this command:`
      );
      throw new Error(errorMessage);
    }

    const feature = this.getFeatureByName(invocation.commandArgs[0]);
    if (!feature) {
      const errorMessage = this.formatParameterErrorMessage(
        `There is no feature with the name \`${invocation.commandArgs[0]}\`. The features that I know about are as follows:`
      );
      throw new Error(errorMessage);
    }

    await feature.setIsEnabled(
      database,
      invocation.server.id,
      this.shouldEnableFeature
    );

    await invocation.respond({
      text: this.getSuccessMessage(invocation, feature),
      type: 'success',
    });
  }

  protected abstract getSuccessMessage(
    invocation: CommandInvocation,
    feature: Feature
  ): string;

  private getFeatureByName(name: string): Feature | null {
    return FEATURES_LIST.find((feature) => feature.is(name)) || null;
  }

  private formatParameterErrorMessage(message: string): string {
    const lines = [
      message,
      '',
      ...FEATURES_LIST.map((feature) => feature.getInformationalDisplayLine()),
    ];
    return lines.join('\n');
  }
}

export default EnableDisableCommandBase;
