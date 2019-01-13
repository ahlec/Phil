import { Moment } from 'moment';
import Bucket from '../buckets';
import Phil from '../phil';
import Prompt from '../prompts/prompt';
import Submission from '../prompts/submission';
import { PromptQueue } from '../prompts/queue';
import ServerConfig from '../server-config';
import Chrono from './@types';

export default class PostNewPromptsChrono implements Chrono {
  public readonly handle = 'post-new-prompts';

  public async process(phil: Phil, serverConfig: ServerConfig, now: Moment) {
    const serverBuckets = await Bucket.getAllForServer(
      phil.bot,
      phil.db,
      serverConfig.server.id
    );

    for (const bucket of serverBuckets) {
      if (bucket.isPaused || !bucket.isValid) {
        continue;
      }

      await this.processBucket(phil, serverConfig, now, bucket);
    }
  }

  private async processBucket(
    phil: Phil,
    serverConfig: ServerConfig,
    now: Moment,
    bucket: Bucket
  ) {
    const currentPrompt = await Prompt.getCurrentPrompt(
      phil.bot,
      phil.db,
      bucket
    );
    if (!this.isCurrentPromptOutdated(currentPrompt, now, bucket)) {
      console.log(
        '[CHRONOS]    - bucket %s on server %s is not ready for a new prompt just yet',
        bucket.handle,
        serverConfig.serverId
      );
      return;
    }

    const nextPrompt = await this.getNextPrompt(phil, bucket);
    if (!nextPrompt) {
      console.log(
        `[CHRONOS]    - bucket ${bucket.handle} on server ${
          serverConfig.serverId
        } has no prompts to post`
      );
      return;
    }

    console.log(
      `[CHRONOS]    - posting prompt ${nextPrompt.id} to bucket ${
        bucket.handle
      } on server ${serverConfig.serverId}`
    );
    await nextPrompt.publish(phil.bot, phil.db, serverConfig);
  }

  private async getNextPrompt(phil: Phil, bucket: Bucket): Promise<Prompt> {
    const promptQueue = await PromptQueue.getPromptQueue(
      phil.bot,
      phil.db,
      bucket,
      1,
      1
    );

    if (promptQueue.count > 0) {
      console.log('from the queue');
      return promptQueue.entries[0].prompt;
    }

    const [dustiest] = await Submission.getDustiestSubmissions(
      phil.db,
      bucket,
      1
    );
    if (dustiest) {
      console.log('got dustiest');
      const prompt = await Prompt.queueSubscription(phil.db, dustiest);
      return prompt;
    } else {
      console.log('no dusties?');
    }
  }

  private isCurrentPromptOutdated(
    currentPrompt: Prompt,
    now: Moment,
    bucket: Bucket
  ) {
    if (!currentPrompt || !currentPrompt.promptDate) {
      return true;
    }

    return bucket.isFrequencyMet(currentPrompt.promptDate, now);
  }
}
