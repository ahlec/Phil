import { Client as DiscordIOClient } from 'discord.io';
import * as moment from 'moment';

import Member from '@phil/discord/Member';
import Server from '@phil/discord/Server';

import Database from './database';
import Prompt from './prompts/prompt';
import PromptQueue from './prompts/queue';
import Submission from './prompts/submission';
import ServerSubmissionsCollection from './ServerSubmissionsCollection';
import ServerConfig from './server-config';

export enum BucketFrequency {
  Daily = 0,
  Weekly = 1,
  Immediately = 2,
}

const frequencyDisplayStrings = {
  [BucketFrequency.Daily]: 'Daily',
  [BucketFrequency.Weekly]: 'Weekly',
  [BucketFrequency.Immediately]: 'Immediately',
};

interface SubmissionDbRow {
  submission_id: number;
  suggesting_userid: string;
  date_suggested: number;
  approved_by_admin: '0' | '1';
  submitted_anonymously: '0' | '1';
  submission_text: string;
}

class Bucket {
  public readonly isValid: boolean;
  public readonly handle: string;
  public readonly displayName: string;
  public readonly isPaused: boolean;
  public readonly requiredRoleId?: string;
  public readonly alertWhenLow: boolean;
  public readonly frequency: BucketFrequency;
  public readonly promptTitleFormat: string;
  public internalAlertedBucketEmptying: boolean;

  public constructor(
    private readonly discordClient: DiscordIOClient,
    private readonly database: Database,
    private readonly submissionsCollection: ServerSubmissionsCollection,
    private readonly serverConfig: ServerConfig,
    public readonly id: number,
    public readonly server: Server,
    public readonly channelId: string,
    contents: {
      isValid: boolean;
      handle: string;
      displayName: string;
      isPaused: boolean;
      requiredRoleId?: string;
      alertWhenLow: boolean;
      frequency: BucketFrequency;
      promptTitleFormat: string;
      alertedBucketEmptying: boolean;
    }
  ) {
    this.isValid = contents.isValid;
    this.handle = contents.handle;
    this.displayName = contents.displayName;
    this.isPaused = contents.isPaused;
    this.requiredRoleId = contents.requiredRoleId;
    this.alertWhenLow = contents.alertWhenLow;
    this.frequency = contents.frequency;
    this.promptTitleFormat = contents.promptTitleFormat;
    this.internalAlertedBucketEmptying = contents.alertedBucketEmptying;
  }

  public get alertedBucketEmptying(): boolean {
    return this.internalAlertedBucketEmptying;
  }

  public get frequencyDisplayName(): string {
    return frequencyDisplayStrings[this.frequency];
  }

  public getPromptQueue(): Promise<PromptQueue> {
    return PromptQueue.get(
      this.discordClient,
      this.database,
      this.submissionsCollection,
      this.serverConfig,
      this
    );
  }

  public async setIsPaused(isPaused: boolean): Promise<void> {
    const rowsModified = await this.database.execute(
      'UPDATE prompt_buckets SET is_paused = $1 WHERE bucket_id = $2',
      [isPaused ? 1 : 0, this.id]
    );
    if (rowsModified !== 1) {
      throw new Error(
        'Unable to update the status of the prompt bucket in the database.'
      );
    }
  }

  public isFrequencyMet(
    lastDate: moment.Moment,
    currentDate: moment.Moment
  ): boolean {
    switch (this.frequency) {
      case BucketFrequency.Daily:
        return !lastDate.isSame(currentDate, 'day');
      case BucketFrequency.Weekly:
        return moment(lastDate).format('W') !== moment(currentDate).format('W');
      case BucketFrequency.Immediately:
        return false;
      default:
        throw new Error(`Unrecognized frequency type: '${this.frequency}'`);
    }
  }

  public convertPromptQueueLengthToDays(queueLength: number): number {
    switch (this.frequency) {
      case BucketFrequency.Daily:
        return queueLength;
      case BucketFrequency.Weekly:
        return queueLength * 7;
      case BucketFrequency.Immediately:
        return 0;
      default:
        throw new Error(
          "Unrecognized frequency type: '" + this.frequency + "'"
        );
    }
  }

  public async markAlertedEmptying(hasAlerted: boolean): Promise<void> {
    const rowsModified = await this.database.execute(
      'UPDATE prompt_buckets SET alerted_bucket_emptying = $1 WHERE bucket_id = $2',
      [hasAlerted ? 1 : 0, this.id]
    );
    if (rowsModified !== 1) {
      throw new Error('Unable to update the prompt bucket in the database.');
    }

    this.internalAlertedBucketEmptying = hasAlerted;
  }

  public canUserSubmitTo(member: Member): boolean {
    if (!this.requiredRoleId) {
      return true;
    }

    return member.roles.some(
      (role): boolean => role.id === this.requiredRoleId
    );
  }

  public async getUnconfirmedSubmissions(
    maxResults: number
  ): Promise<readonly Submission[]> {
    const { rows } = await this.database.query<SubmissionDbRow>(
      `SELECT
        submission_id,
        bucket_id,
        suggesting_userid,
        date_suggested,
        approved_by_admin,
        submitted_anonymously,
        submission_text
      FROM
        submission
      WHERE
        bucket_id = $1 AND
        approved_by_admin = E'0'
      ORDER BY
        date_suggested ASC
      LIMIT $2`,
      [this.id, maxResults]
    );

    return Promise.all(
      rows.map((dbRow): Promise<Submission> => this.parseSubmission(dbRow))
    );
  }

  /**
   * Gets the submission(s) from the provided bucket that were approved
   * by an admin and which have already been posted before, ordered so that the first
   * return entry is the oldest submission that hasn't been repeated yet ("the dustiest").
   * Not a great name but I don't want a function with 90 words in it.
   */
  public async getDustiestSubmissions(
    maxResults: number
  ): Promise<readonly Submission[]> {
    const { rows } = await this.database.query<SubmissionDbRow>(
      `SELECT
          s.submission_id,
          MAX(s.bucket_id) AS "bucket_id",
          MAX(s.suggesting_userid) AS "suggesting_userid",
          MAX(s.date_suggested) AS "date_suggested",
          BIT_AND(s.approved_by_admin) AS "approved_by_admin",
          BIT_AND(s.submitted_anonymously) AS "submitted_anonymously",
          MAX(s.submission_text) AS "submission_text",
          MAX(p.prompt_date) AS "date_last_posted"
        FROM
          prompt_v2 AS p
        JOIN
          submission AS s
        ON
          p.submission_id = s.submission_id
        WHERE
          p.prompt_date IS NOT NULL AND
          s.bucket_id = $1
        GROUP BY
          s.submission_id
        ORDER BY
          date_last_posted ASC
        LIMIT $2`,
      [this.id, maxResults]
    );

    return Promise.all(
      rows.map((dbRow): Promise<Submission> => this.parseSubmission(dbRow))
    );
  }

  public async getCurrentPrompt(): Promise<Prompt | null> {
    const result = await this.database.querySingle<{
      prompt_id: string;
      submission_id: string;
      prompt_number: string;
      prompt_date: string | null;
      repetition_number: string;
    }>(
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
      [this.id]
    );

    if (!result) {
      return null;
    }

    const submission = await this.submissionsCollection.retrieve({
      id: parseInt(result.submission_id, 10),
      type: 'id',
    });
    if (!submission) {
      throw new Error(
        `Could not retrieve submission '${result.submission_id}' for prompt '${result.prompt_id}'`
      );
    }

    return new Prompt(
      this.database,
      this.serverConfig,
      submission,
      parseInt(result.prompt_id, 10),
      parseInt(result.prompt_number, 10),
      parseInt(result.repetition_number, 10),
      result.prompt_date ? moment(result.prompt_date) : null
    );
  }

  private async parseSubmission(dbRow: SubmissionDbRow): Promise<Submission> {
    const member = await this.server.getMember(dbRow.suggesting_userid);
    return new Submission(
      this.database,
      this.serverConfig,
      this,
      dbRow.submission_id,
      member,
      {
        approvedByAdmin: parseInt(dbRow.approved_by_admin, 10) === 1,
        dateSuggested: moment(dbRow.date_suggested),
        submissionText: dbRow.submission_text,
        submittedAnonymously: parseInt(dbRow.submitted_anonymously, 10) === 1,
      }
    );
  }
}

export default Bucket;
