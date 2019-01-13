import { Client as DiscordIOClient } from 'discord.io';
import * as moment from 'moment';
import Database from '../database';
import Bucket from '../buckets';

export default class Submission {
  public static async getFromId(
    client: DiscordIOClient,
    db: Database,
    submissionId: number
  ): Promise<Submission> {
    const result = await db.querySingle(
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
    return new Submission(bucket, result);
  }

  public static async getUnconfirmed(
    db: Database,
    bucket: Bucket,
    maxNumResults: number
  ): Promise<Submission[]> {
    const { rows } = await db.query(
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

  public readonly id: number;
  public readonly suggestingUserId: string;
  public readonly dateSuggested: moment.Moment;
  public readonly approvedByAdmin: boolean;
  public readonly submittedAnonymously: boolean;
  public readonly submissionText: string;

  private constructor(public readonly bucket: Bucket, dbRow: any) {
    this.id = dbRow.submission_id;
    this.suggestingUserId = dbRow.suggesting_userid;
    this.dateSuggested = moment(dbRow.date_suggested);
    this.approvedByAdmin = parseInt(dbRow.approved_by_admin, 10) === 1;
    this.submittedAnonymously = parseInt(dbRow.submitted_anonymously, 10) === 1;
    this.submissionText = dbRow.submission_text;
  }
}
