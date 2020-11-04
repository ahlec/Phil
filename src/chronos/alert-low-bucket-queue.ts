import Client from '@phil/discord/Client';
import Server from '@phil/discord/Server';

import Bucket from '@phil/buckets';
import Database from '@phil/database';
import Features from '@phil/features/all-features';
import ServerConfig from '@phil/server-config';
import Chrono, { Logger, LoggerDefinition } from './@types';
import ServerBucketsCollection from '@phil/ServerBucketsCollection';

const PROMPT_QUEUE_EMPTY_ALERT_THRESHOLD = 5;

const HANDLE = 'alert-low-bucket-queue';
export default class AlertLowBucketQueueChrono
  extends Logger
  implements Chrono {
  public readonly databaseId = 6;
  public readonly handle = HANDLE;
  public readonly requiredFeature = Features.Prompts;

  public constructor(parentDefinition: LoggerDefinition) {
    super(new LoggerDefinition(HANDLE, parentDefinition));
  }

  public async process(
    discordClient: Client,
    database: Database,
    server: Server,
    serverConfig: ServerConfig
  ): Promise<void> {
    const bucketCollection = new ServerBucketsCollection(
      discordClient,
      database,
      server,
      serverConfig
    );
    const serverBuckets = await bucketCollection.getAll();

    for (const bucket of serverBuckets) {
      if (
        !bucket.isValid ||
        bucket.isPaused ||
        !bucket.alertWhenLow ||
        bucket.alertedBucketEmptying
      ) {
        continue;
      }

      const queue = await bucket.getPromptQueue();
      if (queue.totalLength > PROMPT_QUEUE_EMPTY_ALERT_THRESHOLD) {
        continue;
      }

      await this.alertQueueDwindling(serverConfig, bucket, queue.totalLength);
    }
  }

  private async alertQueueDwindling(
    serverConfig: ServerConfig,
    bucket: Bucket,
    queueLength: number
  ): Promise<void> {
    const are = queueLength === 1 ? 'is' : 'are';
    const promptNoun = queueLength === 1 ? 'prompt' : 'prompts';
    const message = `:warning: The queue for **${bucket.displayName}** (\`${
      bucket.handle
    }\`) is growing short. There ${are}  **${
      queueLength > 0 ? queueLength : 'no'
    }** more ${promptNoun} in the queue.`;
    await serverConfig.botControlChannel.sendMessage({
      text: message,
      type: 'plain',
    });

    bucket.markAlertedEmptying(true);
  }
}
