import { Client as DiscordIOClient } from 'discord.io';

import Bucket from '@phil/buckets';
import Database from '@phil/database';
import Prompt from './prompt';
import ServerSubmissionsCollection from '@phil/ServerSubmissionsCollection';
import PromptQueuePage, { PromptQueueEntry } from './PromptQueuePage';
import ServerConfig from '@phil/server-config';

async function getTotalLength(
  database: Database,
  bucketId: number
): Promise<number> {
  const result = await database.querySingle<{ count: string }>(
    `SELECT
      count(*)
    FROM
      prompt_v2 AS p
    JOIN
      submission AS s
    ON
      p.submission_id = s.submission_id
    WHERE
      s.bucket_id = $1 AND
      s.approved_by_admin = E'1' AND
      p.prompt_date IS NULL`,
    [bucketId]
  );

  if (!result) {
    return 0;
  }

  return parseInt(result.count, 10);
}

class PromptQueue {
  public static async get(
    discordClient: DiscordIOClient,
    database: Database,
    submissionsCollection: ServerSubmissionsCollection,
    serverConfig: ServerConfig,
    bucket: Bucket
  ): Promise<PromptQueue> {
    const totalLength = await getTotalLength(database, bucket.id);
    return new PromptQueue(
      discordClient,
      database,
      submissionsCollection,
      serverConfig,
      bucket,
      totalLength
    );
  }

  public constructor(
    private readonly discordClient: DiscordIOClient,
    private readonly database: Database,
    private readonly submissionsCollection: ServerSubmissionsCollection,
    private readonly serverConfig: ServerConfig,
    public readonly bucket: Bucket,
    public readonly totalLength: number
  ) {}

  public async getPage(
    pageNum: number,
    pageSize: number
  ): Promise<PromptQueuePage> {
    const dbResults = await this.database.query<{
      prompt_id: string;
      prompt_number: string;
      repetition_number: string;
      submission_id: string;
    }>(
      `SELECT
        p.prompt_id,
        p.prompt_number,
        p.submission_id,
        p.repetition_number
      FROM
        prompt_v2 AS p
      JOIN
        submission AS s
      ON
        p.submission_id = s.submission_id
      WHERE
        p.prompt_date IS NULL AND
        s.approved_by_admin = E'1' AND
        s.bucket_id = $1
      ORDER BY
        p.prompt_number ASC
      LIMIT $2
      OFFSET $3`,
      [this.bucket.id, pageSize, (pageNum - 1) * pageSize]
    );

    const submissions = await this.submissionsCollection.batchRetrieve({
      ids: new Set(
        dbResults.rows.map((row): number => parseInt(row.submission_id, 10))
      ),
      type: 'id',
    });

    const queueStart = (pageNum - 1) * pageSize + 1;
    return new PromptQueuePage(
      this.discordClient,
      this.database,
      this.bucket,
      dbResults.rows.map(
        (row, index): PromptQueueEntry => {
          const submissionId = parseInt(row.submission_id, 10);
          const submission = submissions[submissionId];
          if (!submission) {
            throw new Error(
              `Did not find submission '${submissionId}' when trying to load queued prompt '${row.prompt_id}' in '${this.bucket.id}'`
            );
          }

          return {
            position: queueStart + index,
            prompt: new Prompt(
              this.database,
              this.serverConfig,
              submission,
              parseInt(row.prompt_id, 10),
              parseInt(row.prompt_number, 10),
              parseInt(row.repetition_number, 10),
              null
            ),
          };
        }
      ),
      pageNum,
      pageSize,
      this.totalLength
    );
  }
}

export default PromptQueue;
