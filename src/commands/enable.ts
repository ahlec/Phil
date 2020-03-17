import Feature from '@phil/features/feature';
import PublicMessage from '@phil/messages/public';
import { LoggerDefinition } from './@types';
import EnableDisableCommandBase from './bases/enable-disable-base';

export default class EnableCommand extends EnableDisableCommandBase {
  public constructor(parentDefinition: LoggerDefinition) {
    super('enable', parentDefinition, {
      helpDescription: "Enables a feature of Phil's.",
      shouldEnableFeature: true,
    });
  }

  protected getSuccessMessage(
    message: PublicMessage,
    feature: Feature
  ): string {
    return `The **${feature.displayName}** feature is no longer disabled. You can disable this feature by using \`${message.serverConfig.commandPrefix}disable\`.`;
  }
}
