import Features from '../features/all-features';
import PublicMessage from '../messages/public';
import Phil from '../phil';
import { sendMessage } from '../promises/discord';
import { sendErrorMessage } from '../utils';
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

  public processMessage(
    phil: Phil,
    message: PublicMessage,
    commandArgs: ReadonlyArray<string>
  ): Promise<any> {
    if (!message.serverConfig.fandomMapLink) {
      return sendErrorMessage({
        bot: phil.bot,
        channelId: message.channelId,
        message:
          'This server has not provided a link to a shared map of the fandom.',
      });
    }

    return sendMessage(
      phil.bot,
      message.channelId,
      message.serverConfig.fandomMapLink
    );
  }
}
