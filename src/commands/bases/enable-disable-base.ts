import AllFeatures from '@phil/features/all-features';
import Feature from '@phil/features/feature';
import { HelpGroup } from '@phil/help-groups';
import PublicMessage from '@phil/messages/public';
import PermissionLevel from '@phil/permission-level';
import Phil from '@phil/phil';
import { sendSuccessMessage } from '@phil/utils';
import Command, { LoggerDefinition } from '@phil/commands/@types';

const FEATURES_LIST = Object.values(AllFeatures);

interface EnableDisableCommandBaseDetails {
  helpDescription: string;
  shouldEnableFeature: boolean;
}

export default abstract class EnableDisableCommandBase extends Command {
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

  public async processMessage(
    phil: Phil,
    message: PublicMessage,
    commandArgs: ReadonlyArray<string>
  ): Promise<void> {
    if (commandArgs.length < 1) {
      const errorMessage = this.formatParameterErrorMessage(
        `You must specify one of the features listed below when using this command:`
      );
      throw new Error(errorMessage);
    }

    const feature = this.getFeatureByName(commandArgs[0]);
    if (!feature) {
      const errorMessage = this.formatParameterErrorMessage(
        `There is no feature with the name \`${commandArgs[0]}\`. The features that I know about are as follows:`
      );
      throw new Error(errorMessage);
    }

    await feature.setIsEnabled(
      phil.db,
      message.server.id,
      this.shouldEnableFeature
    );

    await sendSuccessMessage({
      bot: phil.bot,
      channelId: message.channelId,
      message: this.getSuccessMessage(message, feature),
    });
  }

  protected abstract getSuccessMessage(
    message: PublicMessage,
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
