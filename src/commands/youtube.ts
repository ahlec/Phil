import CommandInvocation from '@phil/CommandInvocation';
import Phil from '@phil/phil';
import { searchYouTube } from '@phil/promises/youtube';
import Command, { LoggerDefinition } from './@types';

class YoutubeCommand extends Command {
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
    invocation: CommandInvocation
  ): Promise<void> {
    const query = invocation.commandArgs.join(' ').trim();
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
    await invocation.respond({
      text: link,
      type: 'plain',
    });
  }
}

export default YoutubeCommand;
