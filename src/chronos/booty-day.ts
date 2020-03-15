import { Moment } from 'moment';
import Features from '../features/all-features';
import GlobalConfig from '../GlobalConfig';
import Phil from '../phil';
import { sendMessage } from '../promises/discord';
import ServerConfig from '../server-config';
import Chrono, { Logger, LoggerDefinition } from './@types';

const HANDLE = 'booty-day';
export default class BootyDayChrono extends Logger implements Chrono {
  public readonly handle = HANDLE;
  public readonly requiredFeature = Features.Prompts;

  public constructor(parentDefinition: LoggerDefinition) {
    super(new LoggerDefinition(HANDLE, parentDefinition));
  }

  public async process(phil: Phil, serverConfig: ServerConfig, now: Moment) {
    if (serverConfig.serverId !== GlobalConfig.hijackServerId) {
      this.write(
        `Server ${serverConfig.serverId} is not a Hijack server, skipping`
      );
      return;
    }

    if (now.date() !== 3) {
      this.write("Today isn't booty day.");
      return;
    }

    sendMessage(
      phil.bot,
      serverConfig.newsChannel.id,
      process.env.CUSTOM_EMOJI_PEEK +
        " It's booty day! Post your Hijack booties!"
    );
  }
}
