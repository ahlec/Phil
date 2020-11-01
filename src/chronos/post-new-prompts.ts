import { Moment } from 'moment';

import Client from '@phil/discord/Client';
import Server from '@phil/discord/Server';

import Bucket from '@phil/buckets';
import Database from '@phil/database';
import Features from '@phil/features/all-features';
import Prompt from '@phil/prompts/prompt';
import ServerConfig from '@phil/server-config';
import Chrono, { Logger, LoggerDefinition } from './@types';
import ServerBucketsCollection from '@phil/ServerBucketsCollection';

const HANDLE = 'post-new-prompts';

interface NextPrompt {
  prompt: Prompt;
  isReusedPrompt: boolean;
}

export default class PostNewPromptsChrono extends Logger implements Chrono {
  public readonly handle = HANDLE;
  public readonly requiredFeature = Features.Prompts;

  public constructor(parentDefinition: LoggerDefinition) {
    super(new LoggerDefinition(HANDLE, parentDefinition));
  }

  public async process(
    discordClient: Client,
    database: Database,
    server: Server,
    serverConfig: ServerConfig,
    now: Moment
  ): Promise<void> {
    const bucketCollection = new ServerBucketsCollection(
      discordClient,
      database,
      server,
      serverConfig
    );
    const serverBuckets = await bucketCollection.getAll();

    await Promise.all(
      serverBuckets.map((bucket) => this.processBucket(server, now, bucket))
    );
  }

  private async processBucket(
    server: Server,
    now: Moment,
    bucket: Bucket
  ): Promise<void> {
    if (bucket.isPaused || !bucket.isValid || !bucket.channel) {
      return;
    }

    const currentPrompt = await bucket.getCurrentPrompt();
    if (!this.isCurrentPromptOutdated(currentPrompt, now, bucket)) {
      this.write(
        `bucket ${bucket.handle} on server ${server.id} is not ready for a new prompt just yet`
      );
      return;
    }

    const nextPrompt = await this.getNextPrompt(bucket);
    if (!nextPrompt) {
      this.write(
        `bucket ${bucket.handle} on server ${server.id} has no prompts to post`
      );
      return;
    }

    this.write(
      `posting prompt ${nextPrompt.prompt.id} to bucket ${bucket.handle} on server ${server.id}`
    );

    try {
      await nextPrompt.prompt.publish();
      await bucket.channel.sendMessage(nextPrompt.prompt.messageTemplate);

      if (!nextPrompt.isReusedPrompt) {
        await bucket.markAlertedEmptying(false);
      }
    } catch (err) {
      this.error(
        `encountered an error when posting prompt ${nextPrompt.prompt.id} to bucket ${bucket.handle} on server ${server.id}`
      );

      throw err;
    }
  }

  private async getNextPrompt(bucket: Bucket): Promise<NextPrompt | null> {
    const promptQueue = await bucket.getPromptQueue();

    if (promptQueue.totalLength > 0) {
      const firstPage = await promptQueue.getPage(1, 1);
      return { isReusedPrompt: false, prompt: firstPage.entries[0].prompt };
    }

    const [dustiest] = await bucket.getDustiestSubmissions(1);
    if (dustiest) {
      const prompt = await dustiest.addToQueue();
      if (prompt) {
        return { isReusedPrompt: true, prompt };
      }

      return null;
    }

    return null;
  }

  private isCurrentPromptOutdated(
    currentPrompt: Prompt | null,
    now: Moment,
    bucket: Bucket
  ): boolean {
    if (!currentPrompt || !currentPrompt.promptDate) {
      return true;
    }

    return bucket.isFrequencyMet(currentPrompt.promptDate, now);
  }
}
