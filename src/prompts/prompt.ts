import { Client as DiscordIOClient } from 'discord.io';
import * as moment from 'moment';
import Submission from './submission';
import Bucket from '../buckets';
import EmbedColor from '../embed-color';
import Database from '../database';
import { DiscordPromises } from '../promises/discord';
import ServerConfig from '../server-config';
import { BotUtils } from '../utils';

export default class Prompt {
  public static async getFromId(
    client: DiscordIOClient,
    db: Database,
    promptId: number
  ): Promise<Prompt> {
    const result = await db.querySingle(
      `SELECT
        prompt_id,
        submission_id,
        prompt_number,
        prompt_date
      FROM
        prompt_v2
      WHERE
        prompt_id = $1
      LIMIT 1`,
      [promptId]
    );

    if (!result) {
      return null;
    }

    const submission = await Submission.getFromId(
      client,
      db,
      result.submission_id
    );
    return new Prompt(submission, result);
  }

  public static async getCurrentPrompt(
    client: DiscordIOClient,
    db: Database,
    bucket: Bucket
  ): Promise<Prompt> {
    const result = await db.querySingle(
      `SELECT
        p.prompt_id,
        p.submission_id,
        p.prompt_number,
        p.prompt_date
      FROM
        prompt_v2 AS p
      JOIN
        submission AS s
      ON
        p.submission_id = s.submission_id
      WHERE
        s.bucket_id = $1 AND
        p.prompt_date IS NOT NULL
      ORDER BY
        p.prompt_date DESC
      LIMIT 1`,
      [bucket.id]
    );

    if (!result) {
      return null;
    }

    const submission = await Submission.getFromId(
      client,
      db,
      result.submission_id
    );
    return new Prompt(submission, result);
  }

  public readonly id: number;
  public readonly promptNumber: number;
  public readonly promptDate: moment.Moment | null;

  constructor(public readonly submission: Submission, dbRow: any) {
    this.id = parseInt(dbRow.prompt_id, 10);
    this.promptNumber = parseInt(dbRow.prompt_number, 10);
    this.promptDate = dbRow.prompt_date ? moment(dbRow.prompt_date) : null;
  }

  public sendToChannel(
    client: DiscordIOClient,
    serverConfig: ServerConfig
  ): Promise<string> {
    const {
      bucket: { promptTitleFormat, channelId },
      submissionText,
    } = this.submission;

    return DiscordPromises.sendEmbedMessage(client, channelId, {
      color: EmbedColor.Info,
      description: submissionText,
      footer: {
        text: this.getPromptMessageFooter(client, serverConfig),
      },
      title: promptTitleFormat.replace(/\{0\}/g, this.promptNumber.toString()),
    });
  }

  // public async postAsNewPrompt(
  //   client: DiscordIOClient,
  //   serverConfig: ServerConfig,
  //   now: Date
  // ) {
  //   const nextPromptNumberResults = await phil.db.query(
  //     "SELECT prompt_number FROM prompts WHERE has_been_posted = E'1' AND bucket_id = $1 ORDER BY prompt_number DESC LIMIT 1",
  //     [bucket.id]
  //   );
  //   const promptNumber =
  //     nextPromptNumberResults.rowCount > 0
  //       ? nextPromptNumberResults.rows[0].prompt_number + 1
  //       : 1;
  //
  //   const updateResults = await phil.db.query(
  //     "UPDATE prompts SET has_been_posted = E'1', prompt_number = $1, prompt_date = $2 WHERE prompt_id = $3",
  //     [promptNumber, now, this.promptId]
  //   );
  //   if (updateResults.rowCount === 0) {
  //     throw new Error(
  //       "We found a prompt in the queue, but we couldn't update it to mark it as being posted."
  //     );
  //   }
  //
  //   await this.sendToChannel(
  //     phil,
  //     serverConfig,
  //     bucket.channelId,
  //     bucket,
  //     promptNumber
  //   );
  // }

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
      const displayName = BotUtils.getUserDisplayName(user, server);

      footer += 'by ' + displayName;
      if (!server.members[this.submission.suggestingUserId]) {
        footer += ' (who is no longer in server)';
      }
    }

    footer +=
      '. You can suggest your own by using ' +
      serverConfig.commandPrefix +
      'suggest.';
    return footer;
  }
}
