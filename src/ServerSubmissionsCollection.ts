import Server from '@phil/discord/Server';

import Database from './database';
import ServerBucketsCollection from './ServerBucketsCollection';
import Submission from './prompts/submission';
import Bucket from './buckets';
import moment = require('moment-timezone');
import ServerConfig from './server-config';

interface SubmissionRetrieval {
  type: 'id';
  id: number;
}

interface BatchSubmissionRetrieval {
  type: 'id';
  ids: ReadonlySet<number>;
}

interface SubmissionDatabaseSchema {
  submission_id: number;
  suggesting_userid: string;
  date_suggested: number;
  approved_by_admin: '0' | '1';
  submitted_anonymously: '0' | '1';
  submission_text: string;
}

class ServerSubmissionsCollection {
  public constructor(
    private readonly database: Database,
    private readonly bucketCollection: ServerBucketsCollection,
    private readonly server: Server,
    private readonly serverConfig: ServerConfig
  ) {}

  public async retrieve(
    retrieval: SubmissionRetrieval
  ): Promise<Submission | null> {
    const result = await this.database.querySingle<
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
      [retrieval.id]
    );

    if (!result) {
      return null;
    }

    const bucket = await this.bucketCollection.retrieve({
      id: result.bucket_id,
      type: 'id',
    });
    if (!bucket) {
      return null;
    }

    return this.parseSubmission(result, bucket);
  }

  public async batchRetrieve(
    retrieval: BatchSubmissionRetrieval
  ): Promise<Record<number, Submission | null>> {
    if (!retrieval.ids.size) {
      return {};
    }

    const result = await this.database.query<
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
      [Array.from(retrieval.ids)]
    );

    if (!result.rowCount) {
      return {};
    }

    const buckets = await this.bucketCollection.batchRetrieve({
      ids: new Set(result.rows.map(({ bucket_id }): number => bucket_id)),
      type: 'id',
    });

    const lookup: Record<number, Submission | null> = {};

    await Promise.all(
      result.rows.map(
        async (row): Promise<void> => {
          const bucket = buckets[row.bucket_id];
          if (!bucket) {
            lookup[row.submission_id] = null;
            return;
          }

          lookup[row.submission_id] = await this.parseSubmission(row, bucket);
        }
      )
    );

    return lookup;
  }

  private async parseSubmission(
    dbRow: SubmissionDatabaseSchema,
    bucket: Bucket
  ): Promise<Submission> {
    const suggestingMember = await this.server.getMember(
      dbRow.suggesting_userid
    );
    return new Submission(
      this.database,
      this.serverConfig,
      bucket,
      dbRow.submission_id,
      suggestingMember,
      {
        approvedByAdmin: parseInt(dbRow.approved_by_admin, 10) === 1,
        dateSuggested: moment(dbRow.date_suggested),
        submissionText: dbRow.submission_text,
        submittedAnonymously: parseInt(dbRow.submitted_anonymously, 10) === 1,
      }
    );
  }
}

export default ServerSubmissionsCollection;
