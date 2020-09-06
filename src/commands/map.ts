import CommandInvocation from '@phil/CommandInvocation';
import Features from '@phil/features/all-features';
import Command, { LoggerDefinition } from './@types';

class MapCommand extends Command {
  public constructor(parentDefinition: LoggerDefinition) {
    super('map', parentDefinition, {
      feature: Features.FandomMap,
      helpDescription:
        'Has Phil provide a link to the editable map of the fandom.',
      versionAdded: 8,
    });
  }

  public async invoke(invocation: CommandInvocation): Promise<void> {
    if (!invocation.context.serverConfig.fandomMapLink) {
      await invocation.respond({
        error:
          'This server has not provided a link to a shared map of the fandom.',
        type: 'error',
      });
      return;
    }

    await invocation.respond({
      text: invocation.context.serverConfig.fandomMapLink,
      type: 'plain',
    });
  }
}

export default MapCommand;
