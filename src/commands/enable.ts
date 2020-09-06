import CommandInvocation from '@phil/CommandInvocation';
import Feature from '@phil/features/feature';
import { LoggerDefinition } from './@types';
import EnableDisableCommandBase from './bases/enable-disable-base';

class EnableCommand extends EnableDisableCommandBase {
  public constructor(parentDefinition: LoggerDefinition) {
    super('enable', parentDefinition, {
      helpDescription: "Enables a feature of Phil's.",
      shouldEnableFeature: true,
    });
  }

  protected getSuccessMessage(
    invocation: CommandInvocation,
    feature: Feature
  ): string {
    return `The **${feature.displayName}** feature is no longer disabled. You can disable this feature by using \`${invocation.context.serverConfig.commandPrefix}disable\`.`;
  }
}

export default EnableCommand;
