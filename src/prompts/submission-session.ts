import * as moment from 'moment';

import Server from '@phil/discord/Server';

import Bucket from '@phil/buckets';
import Database from '@phil/database';
import Phil from '@phil/phil';
import ServerBucketsCollection from '@phil/ServerBucketsCollection';

const SESSION_LENGTH_IN_MINUTES = 25;

export default class SubmissionSession {
  public static async getActiveSession(
    phil: Phil,
    userId: string
  ): Promise<SubmissionSession | null> {
    const utcNow = moment.utc();
    const dbRow = await phil.db.querySingle<{
      bucket_id: string;
      server_id: string;
      started_utc: string;
      timeout_utc: string;
      is_anonymous: string;
      num_submitted: string;
    }>(
      `SELECT
        pss.bucket_id,
        pss.started_utc,
        pss.timeout_utc,
        pss.is_anonymous,
        pss.num_submitted,
        pb.server_id
      FROM
        prompt_submission_sessions pss
      LEFT JOIN
        prompt_buckets pb
      ON
        pb.bucket_id = pss.bucket_id
      WHERE
        pss.user_id = $1 AND
        pb.bucket_id IS NOT NULL AND
        timeout_utc > $2`,
      [userId, utcNow]
    );
    if (!dbRow) {
      return null;
    }

    const rawServer = phil.bot.servers[dbRow.server_id];
    if (!rawServer) {
      throw new Error(
        "Trying to get active session for a submission session for a server Phil isn't in any longer."
      );
    }

    const server = new Server(phil.bot, rawServer, rawServer.id);
    const serverConfig = await phil.serverDirectory.getServerConfig(server);
    if (!serverConfig) {
      throw new Error(
        `Could not retrieve server config for a server with configured buckets ('${dbRow.server_id}')`
      );
    }

    const bucketCollection = new ServerBucketsCollection(
      phil.bot,
      phil.db,
      server,
      serverConfig
    );
    const bucket = await bucketCollection.retrieve({
      id: parseInt(dbRow.bucket_id, 10),
      type: 'id',
    });
    if (!bucket) {
      return null;
    }

    const startedUtc = moment.utc(dbRow.started_utc);
    const timeoutUtc = moment.utc(dbRow.timeout_utc);
    const isAnonymous = parseInt(dbRow.is_anonymous, 10) === 1;
    const numSubmitted = parseInt(dbRow.num_submitted, 10);
    return new SubmissionSession(
      phil.db,
      userId,
      bucket,
      startedUtc,
      timeoutUtc,
      isAnonymous,
      numSubmitted
    );
  }

  public static async startNewSession(
    db: Database,
    userId: string,
    bucket: Bucket
  ): Promise<SubmissionSession> {
    await db.execute(
      `DELETE FROM
        prompt_submission_sessions
      WHERE
        user_id = $1`,
      [userId]
    );

    const now = moment.utc();
    const timeout = moment(now).add(SESSION_LENGTH_IN_MINUTES, 'minutes');
    const rowsAdded = await db.execute(
      `INSERT INTO
          prompt_submission_sessions(
            user_id,
            bucket_id,
            started_utc,
            timeout_utc,
            is_anonymous
          )
      VALUES
        ($1, $2, $3, $4, E'0')`,
      [userId, bucket.id, now, timeout]
    );

    if (!rowsAdded) {
      throw new Error('Unable to begin session in the database.');
    }

    return new SubmissionSession(db, userId, bucket, now, timeout, false, 0);
  }

  public readonly remainingTime: moment.Duration;

  private constructor(
    private readonly db: Database,
    private readonly userId: string,
    public readonly bucket: Bucket,
    public readonly startedUtc: moment.Moment,
    public readonly timeoutUtc: moment.Moment,
    private isAnonymous: boolean,
    private numSubmitted: number
  ) {
    this.remainingTime = moment.duration(timeoutUtc.diff(startedUtc));
  }

  public getNumberSubmissions(): number {
    return this.numSubmitted;
  }

  public getIsAnonymous(): boolean {
    return this.isAnonymous;
  }

  public async submit(prompt: string): Promise<void> {
    const isAnonymousBit = this.isAnonymous ? 1 : 0;
    const promptsAdded = await this.db.execute(
      `INSERT INTO
        submission(
          bucket_id,
          suggesting_userid,
          date_suggested,
          submitted_anonymously,
          submission_text
        )
        VALUES
          ($1, $2, CURRENT_TIMESTAMP, $3, $4)`,
      [this.bucket.id, this.userId, isAnonymousBit, prompt]
    );
    if (!promptsAdded) {
      throw new Error('Unable to commit the prompt to the database.');
    }

    const sessionUpdated = await this.db.execute(
      `UPDATE
        prompt_submission_sessions
      SET
        num_submitted = num_submitted + 1
      WHERE
        user_id = $1`,
      [this.userId]
    );
    if (!sessionUpdated) {
      throw new Error(
        'Unable to update the tally for this session in the database.'
      );
    }

    this.numSubmitted++;
  }

  public async makeAnonymous(): Promise<void> {
    if (this.isAnonymous) {
      return;
    }

    const updateSessionResult = await this.db.query(
      `UPDATE prompt_submission_sessions
             SET is_anonymous = E'1'
             WHERE user_id = $1`,
      [this.userId]
    );
    if (updateSessionResult.rowCount !== 1) {
      throw new Error('Unable to make this session anonymous in the database.');
    }

    this.isAnonymous = true;
  }

  public async end(): Promise<void> {
    await this.db.query(
      `DELETE FROM prompt_submission_sessions WHERE user_id = $1`,
      [this.userId]
    );
  }
}
