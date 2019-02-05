import PublicMessage from '../messages/public';
import Phil from '../phil';
import { DiscordPromises } from '../promises/discord';
import YouTubePromises from '../promises/youtube';
import Command, { LoggerDefinition } from './@types';

export default class YoutubeCommand extends Command {
  public constructor(parentDefinition: LoggerDefinition) {
    super('youtube', parentDefinition, {
      aliases: ['yt'],
      helpDescription:
        'Searches YouTube for something and posts a link to the first video.',
      versionAdded: 4,
    });
  }

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
