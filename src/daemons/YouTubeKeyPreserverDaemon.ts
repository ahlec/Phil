import Client from '@phil/discord/Client';

import { ONE_HOUR } from '@phil/constants';
import Database from '@phil/database';
import InfoField from '@phil/database/InfoField';
import { getCurrentPostgresDate } from '@phil/database/utils';
import GlobalConfig from '@phil/GlobalConfig';
import Logger from '@phil/Logger';
import LoggerDefinition from '@phil/LoggerDefinition';
import YouTubeClient from '@phil/YouTubeClient';

const CHECK_INTERVAL_MILLISECONDS = ONE_HOUR * 6;

/**
 * Any Google acount that remains inactive for 90+ days risks being shut down
 * by Google. In order to ensure that Phil's resources remain active regardless
 * of user behavior, this daemon makes an API request at regular intervals to
 * ensure that the account sees regular activity.
 */
class YouTubeKeyPreserverDaemon extends Logger {
  private readonly youtubeClient: YouTubeClient;
  private readonly infoField: InfoField;

  public constructor(
    parentLoggerDefinition: LoggerDefinition,
    private readonly discordClient: Client,
    db: Database
  ) {
    super(
      new LoggerDefinition('YouTubeKeyPreserverDaemon', parentLoggerDefinition)
    );
    this.youtubeClient = new YouTubeClient(GlobalConfig.youtubeApiKey);
    this.infoField = db.makeInfoField('youtube-preserver-daemon-last-run');
  }

  public start(): void {
    this.checkIfShouldPerform();
    setInterval((): void => {
      this.checkIfShouldPerform();
    }, CHECK_INTERVAL_MILLISECONDS);
  }

  private async checkIfShouldPerform(): Promise<void> {
    const lastRan = await this.infoField.getValue();
    if (lastRan === getCurrentPostgresDate()) {
      this.write(`Checked, and last ran: ${lastRan}. Skipping.`);
      return;
    }

    this.performPreservation();
  }

  private async performPreservation(): Promise<void> {
    try {
      const results = await this.youtubeClient.search('phil the yeti', 1);
      this.write(
        `Performed search and received this YouTube video: ${results[0].url}`
      );
    } catch (err) {
      const botManager = await this.discordClient.getUser(
        GlobalConfig.botManagerUserId
      );

      this.error(
        'Encountered an error processing the youtube preserver daemon.'
      );
      this.error(err);

      if (botManager) {
        await botManager.sendDirectMessage({
          color: 'red',
          description: err instanceof Error ? err.message : String(err),
          fields: null,
          footer: 'YouTubeKeyPreserverDaemon error',
          title: ':stop_sign: YouTube Preserver Daemon Error',
          type: 'embed',
        });
      }
    }

    this.infoField.setValue(getCurrentPostgresDate());
  }
}

export default YouTubeKeyPreserverDaemon;
