import * as moment from 'moment';
import Bucket from '../buckets';
import Phil from '../phil';

const SESSION_LENGTH_IN_MINUTES: number = 25;

export default class SubmissionSession {
  public static async getActiveSession(
    phil: Phil,
    userId: string
  ): Promise<SubmissionSession> {
    const utcNow = moment.utc();
    const dbRow = await phil.db.querySingle(
      `SELECT
        pss.*
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

    const bucketId = parseInt(dbRow.bucket_id, 10);
    const bucket = await Bucket.getFromId(phil.bot, phil.db, bucketId);
    if (!bucket) {
      return null;
    }

    const startedUtc = moment.utc(dbRow.started_utc);
    const timeoutUtc = moment.utc(dbRow.timeout_utc);
    const isAnonymous = parseInt(dbRow.is_anonymous, 10) === 1;
    const numSubmitted = parseInt(dbRow.num_submitted, 10);
    return new SubmissionSession(
      userId,
      bucket,
      startedUtc,
      timeoutUtc,
      isAnonymous,
      numSubmitted
    );
  }

  public static async startNewSession(
    phil: Phil,
    userId: string,
    bucket: Bucket
  ): Promise<SubmissionSession> {
    await phil.db.execute(
      `DELETE FROM
        prompt_submission_sessions
      WHERE
        user_id = $1`,
      [userId]
    );

    const now = moment.utc();
    const timeout = moment(now).add(SESSION_LENGTH_IN_MINUTES, 'minutes');
    const rowsAdded = await phil.db.execute(
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

    return new SubmissionSession(userId, bucket, now, timeout, false, 0);
  }

  public readonly remainingTime: moment.Duration;

  private constructor(
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

  public async submit(phil: Phil, prompt: string) {
    const isAnonymousBit = this.isAnonymous ? 1 : 0;
    const promptsAdded = await phil.db.execute(
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

    const sessionUpdated = await phil.db.execute(
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

  public async makeAnonymous(phil: Phil) {
    if (this.isAnonymous) {
      return;
    }

    const updateSessionResult = await phil.db.query(
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

  public async end(phil: Phil) {
    await phil.db.query(
      `DELETE FROM prompt_submission_sessions WHERE user_id = $1`,
      [this.userId]
    );
  }
}
