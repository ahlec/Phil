import Features from '@phil/features/all-features';
import PublicMessage from '@phil/messages/public';
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
    message: PublicMessage
  ): Promise<void> {
    if (!message.serverConfig.fandomMapLink) {
      await sendErrorMessage({
        bot: phil.bot,
        channelId: message.channelId,
        message:
          'This server has not provided a link to a shared map of the fandom.',
      });
      return;
    }

    await sendMessage(
      phil.bot,
      message.channelId,
      message.serverConfig.fandomMapLink
    );
  }
}
