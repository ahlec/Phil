import { Moment } from 'moment';
import Phil from '../phil';
import { DiscordPromises } from '../promises/discord';
import ServerConfig from '../server-config';
import Chrono, { Logger, LoggerDefinition } from './@types';

const HANDLE = 'booty-day';
export default class BootyDayChrono extends Logger implements Chrono {
  public readonly handle = HANDLE;

  public constructor(parentDefinition: LoggerDefinition) {
    super(new LoggerDefinition(HANDLE, parentDefinition));
  }

  public async process(phil: Phil, serverConfig: ServerConfig, now: Moment) {
    if (now.date() !== 3) {
      this.write("Today isn't booty day.");
      return;
    }

    DiscordPromises.sendMessage(
      phil.bot,
      serverConfig.newsChannel.id,
      process.env.CUSTOM_EMOJI_PEEK +
        " It's booty day! Post your Hijack booties!"
    );
  }
}
