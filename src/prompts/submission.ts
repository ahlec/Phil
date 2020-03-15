import { Client as DiscordIOClient } from 'discord.io';
import * as moment from 'moment';
import Bucket from '@phil/buckets';
import Database from '@phil/database';

export interface SubmissionDatabaseSchema {
  submission_id: number;
  suggesting_userid: string;
  date_suggested: number;
  approved_by_admin: '0' | '1';
  submitted_anonymously: '0' | '1';
  submission_text: string;
}

export default class Submission {
  public static async getFromId(
    client: DiscordIOClient,
    db: Database,
    submissionId: number
  ): Promise<Submission | null> {
    const result = await db.querySingle<
      SubmissionDatabaseSchema & { bucket_id: number }
    >(
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
        submission_id = $1
      LIMIT 1`,
      [submissionId]
    );

    if (!result) {
      return null;
    }

    const bucket = await Bucket.getFromId(client, db, result.bucket_id);
    if (!bucket) {
      return null;
    }

    return new Submission(bucket, result);
  }

  public static async getFromBatchIds(
    client: DiscordIOClient,
    db: Database,
    ids: ReadonlySet<number>
  ): Promise<{ [id: number]: Submission | undefined }> {
    const returnValue: { [id: number]: Submission | undefined } = {};
    if (!ids.size) {
      return returnValue;
    }

    const result = await db.query<
      SubmissionDatabaseSchema & { bucket_id: number }
    >(
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
        submission_id = ANY($1::int[])`,
      [[...ids]]
    );

    if (!result.rowCount) {
      return returnValue;
    }

    const bucketIds = new Set<number>();
    result.rows.forEach(({ bucket_id: bucketId }) => bucketIds.add(bucketId));

    const buckets = await Bucket.getFromBatchIds(client, db, bucketIds);
    result.rows.forEach(row => {
      const bucket = buckets[row.bucket_id];
      if (!bucket) {
        return;
      }

      const submission = new Submission(bucket, row);
      returnValue[submission.id] = submission;
    });

    return returnValue;
  }

  public static async getUnconfirmed(
    db: Database,
    bucket: Bucket,
    maxNumResults: number
  ): Promise<Submission[]> {
    const { rows } = await db.query<SubmissionDatabaseSchema>(
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
      [bucket.id, maxNumResults]
    );

    return rows.map(dbRow => new Submission(bucket, dbRow));
  }

  // @description Gets the submission(s) from the provided bucket that were approved
  // by an admin and which have already been posted before, ordered so that the first
  // return entry is the oldest submission that hasn't been repeated yet ("the dustiest").
  // Not a great name but I don't want a function with 90 words in it.
  public static async getDustiestSubmissions(
    db: Database,
    bucket: Bucket,
    maxNumResults: number
  ): Promise<Submission[]> {
    const { rows } = await db.query<SubmissionDatabaseSchema>(
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
      [bucket.id, maxNumResults]
    );

    return rows.map(dbRow => new Submission(bucket, dbRow));
  }

  public readonly id: number;
  public readonly suggestingUserId: string;
  public readonly dateSuggested: moment.Moment;
  public readonly approvedByAdmin: boolean;
  public readonly submittedAnonymously: boolean;
  public readonly submissionText: string;

  private constructor(
    public readonly bucket: Bucket,
    dbRow: SubmissionDatabaseSchema
  ) {
    this.id = dbRow.submission_id;
    this.suggestingUserId = dbRow.suggesting_userid;
    this.dateSuggested = moment(dbRow.date_suggested);
    this.approvedByAdmin = parseInt(dbRow.approved_by_admin, 10) === 1;
    this.submittedAnonymously = parseInt(dbRow.submitted_anonymously, 10) === 1;
    this.submissionText = dbRow.submission_text;
  }
}
