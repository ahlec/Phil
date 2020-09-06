import CommandInvocation from '@phil/CommandInvocation';
import Features from '@phil/features/all-features';
import Phil from '@phil/phil';
import { sendMessage } from '@phil/promises/discord';
import { sendErrorMessage } from '@phil/utils';
import Command, { LoggerDefinition } from './@types';

export default class MapCommand extends Command {
  public constructor(parentDefinition: LoggerDefinition) {
    super('map', parentDefinition, {
      feature: Features.FandomMap,
      helpDescription:
        'Has Phil provide a link to the editable map of the fandom.',
      versionAdded: 8,
    });
  }

  public async processMessage(
    phil: Phil,
    invocation: CommandInvocation
  ): Promise<void> {
    if (!invocation.serverConfig.fandomMapLink) {
      await sendErrorMessage({
        bot: phil.bot,
        channelId: invocation.channelId,
        message:
          'This server has not provided a link to a shared map of the fandom.',
      });
      return;
    }

    await sendMessage(
      phil.bot,
      invocation.channelId,
      invocation.serverConfig.fandomMapLink
    );
  }
}
