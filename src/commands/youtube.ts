import CommandInvocation from '@phil/CommandInvocation';
import GlobalConfig from '@phil/GlobalConfig';
import YouTubeClient from '@phil/YouTubeClient';

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

  public async invoke(invocation: CommandInvocation): Promise<void> {
    const query = invocation.commandArgs.join(' ').trim();
    if (query.length === 0) {
      await invocation.respond({
        error: 'You must provide some text to tell me what to search for.',
        type: 'error',
      });
      return;
    }

    const client = new YouTubeClient(GlobalConfig.youtubeApiKey);
    const [foundVideo] = await client.search(query, 1);
    if (!foundVideo) {
      await invocation.respond({
        error: 'There were no results on YouTube for your search.',
        type: 'error',
      });
      return;
    }

    await invocation.respond({
      text: foundVideo.url,
      type: 'plain',
    });
  }
}

export default YoutubeCommand;
