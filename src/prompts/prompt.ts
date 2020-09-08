import { Client as DiscordIOClient } from 'discord.io';
import * as moment from 'moment';
import Database from '@phil/database';
import EmbedColor from '@phil/embed-color';
import { sendEmbedMessage } from '@phil/promises/discord';
import ServerConfig from '@phil/server-config';
import { getUserDisplayName } from '@phil/utils';
import Submission from './submission';

export interface PromptDatabaseSchema {
  prompt_id: string;
  submission_id: string;
  prompt_number: string;
  prompt_date: string | null;
  repetition_number: string;
}

class Prompt {
  public constructor(
    public readonly submission: Submission,
    public readonly id: number,
    public readonly promptNumber: number,
    public readonly repetitionNumber: number,
    private promptDateInternal: moment.Moment | null
  ) {}

  public get promptDate(): moment.Moment | null {
    return this.promptDateInternal;
  }

  public sendToChannel(
    client: DiscordIOClient,
    serverConfig: ServerConfig
  ): Promise<string> {
    const {
      bucket: { promptTitleFormat, channelId },
      submissionText,
    } = this.submission;

    return sendEmbedMessage(client, channelId, {
      color: EmbedColor.Info,
      description: submissionText,
      footer: {
        text: this.getPromptMessageFooter(client, serverConfig),
      },
      title: promptTitleFormat.replace(/\{0\}/g, this.promptNumber.toString()),
    });
  }

  public async publish(
    client: DiscordIOClient,
    db: Database,
    serverConfig: ServerConfig
  ): Promise<void> {
    if (this.promptDate) {
      throw new Error('This prompt has already been published.');
    }

    this.promptDateInternal = moment.utc();
    try {
      const rowsUpdated = await db.execute(
        `UPDATE
          prompt_v2
        SET
          prompt_date = $1
        WHERE
          prompt_id = $2`,
        [this.promptDateInternal, this.id]
      );

      if (rowsUpdated <= 0) {
        throw new Error('Could not publish the prompt in the database.');
      }
    } catch (e) {
      this.promptDateInternal = null;
      throw e;
    }

    await this.sendToChannel(client, serverConfig);
  }

  private getPromptMessageFooter(
    client: DiscordIOClient,
    serverConfig: ServerConfig
  ): string {
    let footer = 'This was suggested ';

    if (this.submission.submittedAnonymously) {
      footer += 'anonymously';
    } else {
      const server = client.servers[this.submission.bucket.serverId];
      const user = client.users[this.submission.suggestingUserId];
      const displayName = getUserDisplayName(user, server);

      footer += `by ${displayName}`;
      if (!server.members[this.submission.suggestingUserId]) {
        footer += ' (who is no longer in server)';
      }
    }

    if (this.repetitionNumber > 0) {
      const times = this.repetitionNumber === 1 ? 'time' : 'times';
      footer += ` and has been shown ${this.repetitionNumber} ${times} before`;
    }

    footer += `. You can suggest your own by using ${serverConfig.commandPrefix}suggest.`;
    return footer;
  }
}

export default Prompt;
