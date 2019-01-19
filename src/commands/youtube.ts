import Feature from '../features/feature';
import { HelpGroup } from '../help-groups';
import PublicMessage from '../messages/public';
import PermissionLevel from '../permission-level';
import Phil from '../phil';
import { DiscordPromises } from '../promises/discord';
import YouTubePromises from '../promises/youtube';
import ICommand from './@types';

export default class YoutubeCommand implements ICommand {
  public readonly name = 'youtube';
  public readonly aliases = ['yt'];
  public readonly feature: Feature = null;
  public readonly permissionLevel = PermissionLevel.General;

  public readonly helpGroup = HelpGroup.General;
  public readonly helpDescription =
    'Searches YouTube for something and posts a link to the first video.';

  public readonly versionAdded = 4;

  public async processMessage(
    phil: Phil,
    message: PublicMessage,
    commandArgs: ReadonlyArray<string>
  ): Promise<any> {
    const query = commandArgs.join(' ').trim();
    if (query.length === 0) {
      throw new Error(
        'You must provide some text to tell me what to search for.'
      );
    }

    const results = await YouTubePromises.search(query);
    if (results.length === 0 || !results[0].id) {
      throw new Error('There were no results on YouTube for you search.');
    }

    const link = 'https://youtu.be/' + results[0].id;
    DiscordPromises.sendMessage(phil.bot, message.channelId, link);
  }
}
