import Server from '@phil/discord/Server';

import { Moment } from 'moment';
import Features from '@phil/features/all-features';
import GlobalConfig from '@phil/GlobalConfig';
import Phil from '@phil/phil';
import ServerConfig from '@phil/server-config';
import Chrono, { Logger, LoggerDefinition } from './@types';
import { sendMessageTemplate } from '@phil/utils/discord-migration';

const HANDLE = 'booty-day';
export default class BootyDayChrono extends Logger implements Chrono {
  public readonly handle = HANDLE;
  public readonly requiredFeature = Features.Prompts;

  public constructor(parentDefinition: LoggerDefinition) {
    super(new LoggerDefinition(HANDLE, parentDefinition));
  }

  public async process(
    phil: Phil,
    server: Server,
    serverConfig: ServerConfig,
    now: Moment
  ): Promise<void> {
    if (server.id !== GlobalConfig.hijackServerId) {
      this.write(`Server ${server.id} is not a Hijack server, skipping`);
      return;
    }

    if (now.date() !== 3) {
      this.write("Today isn't booty day.");
      return;
    }

    await sendMessageTemplate(phil.bot, serverConfig.newsChannel.id, {
      text:
        process.env.CUSTOM_EMOJI_PEEK +
        " It's booty day! Post your Hijack booties!",
      type: 'plain',
    });
  }
}
