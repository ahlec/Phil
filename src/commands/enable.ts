import Feature from '../features/feature';
import PublicMessage from '../messages/public';
import EnableDisableCommandBase from './bases/enable-disable-base';

export default class EnableCommand extends EnableDisableCommandBase {
  public readonly name = 'enable';
  public readonly helpDescription = "Enables a feature of Phil's.";

  protected readonly shouldEnableFeature: boolean = true;

  protected getSuccessMessage(
    message: PublicMessage,
    feature: Feature
  ): string {
    return `The **${
      feature.displayName
    }** feature is no longer disabled. You can disable this feature by using \`${
      message.serverConfig.commandPrefix
    }disable\`.`;
  }
}
