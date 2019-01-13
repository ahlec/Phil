import Feature from '../../features/feature';
import AllFeatures from '../../features/all-features';
import { HelpGroup } from '../../help-groups';
import PublicMessage from '../../messages/public';
import Phil from '../../phil';
import PermissionLevel from '../../permission-level';
import BotUtils from '../../utils';
import ICommand from '../@types';

const FEATURES_LIST = Object.values(AllFeatures);

export default abstract class EnableDisableCommandBase implements ICommand {
  public abstract readonly name: string;
  public readonly aliases: ReadonlyArray<string> = [];
  public readonly feature: Feature = null;
  public readonly permissionLevel = PermissionLevel.AdminOnly;

  public readonly helpGroup = HelpGroup.Admin;
  public abstract readonly helpDescription: string = null;

  public readonly versionAdded = 9;

  protected abstract readonly shouldEnableFeature: boolean;

  public async processMessage(
    phil: Phil,
    message: PublicMessage,
    commandArgs: ReadonlyArray<string>
  ): Promise<any> {
    if (commandArgs.length < 1) {
      const errorMessage = this.formatParameterErrorMessage(
        `You must specify one of the features listed below when using this command:`
      );
      throw new Error(errorMessage);
    }

    const feature = this.getFeatureByName(commandArgs[0]);
    if (!feature) {
      const errorMessage = this.formatParameterErrorMessage(
        `There is no feature with the name \`${
          commandArgs[0]
        }\`. The features that I know about are as follows:`
      );
      throw new Error(errorMessage);
    }

    await feature.setIsEnabled(
      phil.db,
      message.server.id,
      this.shouldEnableFeature
    );

    await BotUtils.sendSuccessMessage({
      bot: phil.bot,
      channelId: message.channelId,
      message: this.getSuccessMessage(message, feature),
    });
  }

  protected abstract getSuccessMessage(
    message: PublicMessage,
    feature: Feature
  ): string;

  private getFeatureByName(name: string): Feature {
    return FEATURES_LIST.find(feature => feature.is(name));
  }

  private formatParameterErrorMessage(message: string): string {
    const lines = [
      message,
      '',
      ...FEATURES_LIST.map(feature => feature.getInformationalDisplayLine()),
    ];
    return lines.join('\n');
  }
}
