import Feature from '../features/feature';
import PublicMessage from '../messages/public';
import EnableDisableCommandBase from './bases/enable-disable-base';

export default class DisableCommand extends EnableDisableCommandBase {
  public readonly name = 'disable';
  public readonly helpDescription = "Disables a feature of Phil's.";

  protected readonly shouldEnableFeature: boolean = false;

  protected getSuccessMessage(
    message: PublicMessage,
    feature: Feature
  ): string {
    return `The **${
      feature.displayName
    }** feature is now disabled. You can enable this feature again by using \`${
      message.serverConfig.commandPrefix
    }enable\`.`;
  }
}
