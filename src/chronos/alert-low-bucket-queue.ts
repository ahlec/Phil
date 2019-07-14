import Bucket from '../buckets';
import Features from '../features/all-features';
import Phil from '../phil';
import { DiscordPromises } from '../promises/discord';
import { PromptQueue } from '../prompts/queue';
import ServerConfig from '../server-config';
import Chrono, { Logger, LoggerDefinition } from './@types';

const PROMPT_QUEUE_EMPTY_ALERT_THRESHOLD = 5;

const HANDLE = 'alert-low-bucket-queue';
export default class AlertLowBucketQueueChrono extends Logger
  implements Chrono {
  public readonly handle = HANDLE;
  public readonly requiredFeature = Features.Prompts;

  public constructor(parentDefinition: LoggerDefinition) {
    super(new LoggerDefinition(HANDLE, parentDefinition));
  }

  public async process(phil: Phil, serverConfig: ServerConfig) {
    const serverBuckets = await Bucket.getAllForServer(
      phil.bot,
      phil.db,
      serverConfig.server.id
    );

    for (const bucket of serverBuckets) {
      if (
        !bucket.isValid ||
        bucket.isPaused ||
        !bucket.alertWhenLow ||
        bucket.alertedBucketEmptying
      ) {
        continue;
      }

      const queueLength = await PromptQueue.getTotalLength(phil.db, bucket);
      if (queueLength > PROMPT_QUEUE_EMPTY_ALERT_THRESHOLD) {
        continue;
      }

      this.alertQueueDwindling(phil, serverConfig, bucket, queueLength);
    }
  }

  private alertQueueDwindling(
    phil: Phil,
    serverConfig: ServerConfig,
    bucket: Bucket,
    queueLength: number
  ) {
    const are = queueLength === 1 ? 'is' : 'are';
    const promptNoun = queueLength === 1 ? 'prompt' : 'prompts';
    const message = `:warning: The queue for **${bucket.displayName}** (\`${
      bucket.handle
    }\`) is growing short. There ${are}  **${
      queueLength > 0 ? queueLength : 'no'
    }** more ${promptNoun} in the queue.`;
    DiscordPromises.sendMessage(
      phil.bot,
      serverConfig.botControlChannel.id,
      message
    );

    bucket.markAlertedEmptying(phil.db, true);
  }
}
