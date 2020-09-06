import CommandInvocation from '@phil/CommandInvocation';
import Feature from '@phil/features/feature';
import { LoggerDefinition } from './@types';
import EnableDisableCommandBase from './bases/enable-disable-base';

class DisableCommand extends EnableDisableCommandBase {
  public constructor(parentDefinition: LoggerDefinition) {
    super('disable', parentDefinition, {
      helpDescription: "Disables a feature of Phil's.",
      shouldEnableFeature: false,
    });
  }

  protected getSuccessMessage(
    invocation: CommandInvocation,
    feature: Feature
  ): string {
    return `The **${feature.displayName}** feature is now disabled. You can enable this feature again by using \`${invocation.context.serverConfig.commandPrefix}enable\`.`;
  }
}

export default DisableCommand;
