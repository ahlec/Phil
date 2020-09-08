import { Moment } from 'moment';
import Bucket from '@phil/buckets';
import Features from '@phil/features/all-features';
import Phil from '@phil/phil';
import Prompt from '@phil/prompts/prompt';
import ServerConfig from '@phil/server-config';
import Chrono, { Logger, LoggerDefinition } from './@types';
import ServerBucketsCollection from '@phil/ServerBucketsCollection';
import { sendMessageTemplate } from '@phil/utils/discord-migration';

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
    phil: Phil,
    serverConfig: ServerConfig,
    now: Moment
  ): Promise<void> {
    const bucketCollection = new ServerBucketsCollection(
      phil.bot,
      phil.db,
      serverConfig.server.id,
      serverConfig
    );
    const serverBuckets = await bucketCollection.getAll();

    const processes = serverBuckets.map((bucket) => {
      if (bucket.isPaused || !bucket.isValid) {
        return Promise.resolve();
      }

      return this.processBucket(phil, serverConfig, now, bucket);
    });

    await Promise.all(processes);
  }

  private async processBucket(
    phil: Phil,
    serverConfig: ServerConfig,
    now: Moment,
    bucket: Bucket
  ): Promise<void> {
    const currentPrompt = await bucket.getCurrentPrompt();
    if (!this.isCurrentPromptOutdated(currentPrompt, now, bucket)) {
      this.write(
        `bucket ${bucket.handle} on server ${serverConfig.serverId} is not ready for a new prompt just yet`
      );
      return;
    }

    const nextPrompt = await this.getNextPrompt(phil, bucket);
    if (!nextPrompt) {
      this.write(
        `bucket ${bucket.handle} on server ${serverConfig.serverId} has no prompts to post`
      );
      return;
    }

    this.write(
      `posting prompt ${nextPrompt.prompt.id} to bucket ${bucket.handle} on server ${serverConfig.serverId}`
    );

    try {
      await nextPrompt.prompt.publish();
      await sendMessageTemplate(
        phil.bot,
        bucket.channelId,
        nextPrompt.prompt.messageTemplate
      );

      if (!nextPrompt.isReusedPrompt) {
        await bucket.markAlertedEmptying(false);
      }
    } catch (err) {
      this.error(
        `encountered an error when posting prompt ${nextPrompt.prompt.id} to bucket ${bucket.handle} on server ${serverConfig.serverId}`
      );

      throw err;
    }
  }

  private async getNextPrompt(
    phil: Phil,
    bucket: Bucket
  ): Promise<NextPrompt | null> {
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
