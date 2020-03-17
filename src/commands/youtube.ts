import PublicMessage from '@phil/messages/public';
import Phil from '@phil/phil';
import { sendMessage } from '@phil/promises/discord';
import { searchYouTube } from '@phil/promises/youtube';
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
  ): Promise<void> {
    const query = commandArgs.join(' ').trim();
    if (query.length === 0) {
      throw new Error(
        'You must provide some text to tell me what to search for.'
      );
    }

    const results = await searchYouTube(query);
    if (results.length === 0 || !results[0].id) {
      throw new Error('There were no results on YouTube for you search.');
    }

    const link = 'https://youtu.be/' + results[0].id;
    await sendMessage(phil.bot, message.channelId, link);
  }
}
