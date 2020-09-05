import { Moment } from 'moment';
import Bucket from '@phil/buckets';
import Features from '@phil/features/all-features';
import Phil from '@phil/phil';
import Prompt from '@phil/prompts/prompt';
import { PromptQueue } from '@phil/prompts/queue';
import Submission from '@phil/prompts/submission';
import ServerConfig from '@phil/server-config';
import Chrono, { Logger, LoggerDefinition } from './@types';

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
    const serverBuckets = await Bucket.getAllForServer(
      phil.bot,
      phil.db,
      serverConfig.server.id
    );

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
    const currentPrompt = await Prompt.getCurrentPrompt(
      phil.bot,
      phil.db,
      bucket
    );
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
      await nextPrompt.prompt.publish(phil.bot, phil.db, serverConfig);
      if (!nextPrompt.isReusedPrompt) {
        await bucket.markAlertedEmptying(phil.db, false);
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
    const promptQueue = await PromptQueue.getPromptQueue(
      phil.bot,
      phil.db,
      bucket,
      1,
      1
    );

    if (promptQueue.count > 0) {
      return { isReusedPrompt: false, prompt: promptQueue.entries[0].prompt };
    }

    const [dustiest] = await Submission.getDustiestSubmissions(
      phil.db,
      bucket,
      1
    );
    if (dustiest) {
      const prompt = await Prompt.queueSubscription(phil.db, dustiest);
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
