import Feature from '@phil/features/feature';
import PublicMessage from '@phil/messages/public';
import { LoggerDefinition } from './@types';
import EnableDisableCommandBase from './bases/enable-disable-base';

export default class DisableCommand extends EnableDisableCommandBase {
  public constructor(parentDefinition: LoggerDefinition) {
    super('disable', parentDefinition, {
      helpDescription: "Disables a feature of Phil's.",
      shouldEnableFeature: false,
    });
  }

  protected getSuccessMessage(
    message: PublicMessage,
    feature: Feature
  ): string {
    return `The **${feature.displayName}** feature is now disabled. You can enable this feature again by using \`${message.serverConfig.commandPrefix}enable\`.`;
  }
}
