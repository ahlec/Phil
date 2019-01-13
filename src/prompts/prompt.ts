import { Client as DiscordIOClient } from 'discord.io';
import * as moment from 'moment';
import Submission from './submission';
import Bucket from '../buckets';
import EmbedColor from '../embed-color';
import Database from '../database';
import { DiscordPromises } from '../promises/discord';
import ServerConfig from '../server-config';
import { BotUtils } from '../utils';

export interface PromptDatabaseSchema {
  prompt_id: string;
  prompt_number: string;
  prompt_date: string | null;
  repetition_number: string;
}

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
        prompt_date,
        repetition_number
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

  public static async getFromBatchIds(
    client: DiscordIOClient,
    db: Database,
    ids: ReadonlySet<number>
  ): Promise<{ [id: number]: Prompt | undefined }> {
    const returnValue: { [id: number]: Prompt | undefined } = {};
    if (!ids.size) {
      return returnValue;
    }

    const result = await db.query(
      `SELECT
          prompt_id,
          submission_id,
          prompt_number,
          prompt_date,
          repetition_number
        FROM
          prompt_v2
        WHERE
          prompt_id = ANY($1::int[])`,
      [[...ids]]
    );

    if (!result.rowCount) {
      return returnValue;
    }

    const submissionIds = new Set<number>();
    result.rows.forEach(({ submission_id }) =>
      submissionIds.add(parseInt(submission_id, 10))
    );

    const submissions = await Submission.getFromBatchIds(
      client,
      db,
      submissionIds
    );
    result.rows.forEach(row => {
      const submissionId = parseInt(row.submission_id, 10);
      const submission = submissions[submissionId];
      const prompt = new Prompt(submission, row);
      returnValue[prompt.id] = prompt;
    });

    return returnValue;
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
        p.prompt_date,
        p.repetition_number
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

  public static async queueSubscription(
    db: Database,
    submission: Submission
  ): Promise<Prompt> {
    const lastPromptInBucket = await db.querySingle(
      `SELECT
        p.prompt_number
      FROM
        prompt_v2 AS p
      JOIN
        submission AS s
      ON
        p.submission_id = s.submission_id
      WHERE
        s.bucket_id = $1
      ORDER BY
        p.prompt_number DESC
      LIMIT 1`,
      [submission.bucket.id]
    );
    const nextPromptNumber =
      (lastPromptInBucket
        ? parseInt(lastPromptInBucket.prompt_number, 10)
        : 0) + 1;

    const { count: repetitionNumber } = await db.querySingle(
      `SELECT
        count(*)
      FROM
        prompt_v2
      WHERE
        submission_id = $1`,
      [submission.id]
    );

    const creation = await db.query(
      `INSERT INTO
          prompt_v2(
            submission_id,
            prompt_number,
            repetition_number
          )
        VALUES
          ($1, $2, $3)
        RETURNING
          prompt_id,
          submission_id,
          prompt_number,
          prompt_date,
          repetition_number`,
      [submission.id, nextPromptNumber, repetitionNumber]
    );

    if (!creation.rowCount) {
      return null;
    }

    return new Prompt(submission, creation.rows[0]);
  }

  public readonly id: number;
  public readonly promptNumber: number;
  public readonly repetitionNumber: number;
  private _promptDateInternal: moment.Moment | null;

  public constructor(
    public readonly submission: Submission,
    dbRow: PromptDatabaseSchema
  ) {
    this.id = parseInt(dbRow.prompt_id, 10);
    this.promptNumber = parseInt(dbRow.prompt_number, 10);
    this._promptDateInternal = dbRow.prompt_date
      ? moment(dbRow.prompt_date)
      : null;
    this.repetitionNumber = parseInt(dbRow.repetition_number, 10);
  }

  public get promptDate(): moment.Moment | null {
    return this._promptDateInternal;
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

  public async publish(
    client: DiscordIOClient,
    db: Database,
    serverConfig: ServerConfig
  ): Promise<void> {
    if (this.promptDate) {
      throw new Error('This prompt has already been published.');
    }

    this._promptDateInternal = moment.utc();
    try {
      const rowsUpdated = await db.execute(
        `UPDATE
          prompt_v2
        SET
          prompt_date = $1
        WHERE
          prompt_id = $2`,
        [this._promptDateInternal, this.id]
      );

      if (rowsUpdated <= 0) {
        throw new Error('Could not publish the prompt in the database.');
      }
    } catch (e) {
      this._promptDateInternal = null;
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
      const displayName = BotUtils.getUserDisplayName(user, server);

      footer += `by ${displayName}`;
      if (!server.members[this.submission.suggestingUserId]) {
        footer += ' (who is no longer in server)';
      }
    }

    if (this.repetitionNumber > 0) {
      const times = this.repetitionNumber === 1 ? 'time' : 'times';
      footer += ` and has been shown ${this.repetitionNumber} ${times} before`;
    }

    footer += `. You can suggest your own by using ${
      serverConfig.commandPrefix
    }suggest.`;
    return footer;
  }
}
