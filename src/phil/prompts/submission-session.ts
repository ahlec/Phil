import { Phil } from '../phil';
import { Bucket } from '../buckets';
import { Moment, Duration } from 'moment';
import momentModule = require('moment');

const SESSION_LENGTH_IN_MINUTES : number = 10;

export default class SubmissionSession {
    public readonly remainingTime : Duration;

    private constructor(private readonly userId : string,
        public readonly bucket : Bucket,
        public readonly startedUtc : Moment,
        public readonly timeoutUtc : Moment,
        private isAnonymous : boolean,
        private numSubmitted : number) {
        this.remainingTime = momentModule.duration(timeoutUtc.diff(startedUtc));
    }

    static async getActiveSession(phil : Phil, userId : string) : Promise<SubmissionSession | null> {
        const utcNow = momentModule.utc();
        const results = await phil.db.query(`SELECT pss.*
            FROM prompt_submission_sessions pss
            LEFT JOIN prompt_buckets pb
                ON pb.bucket_id = pss.bucket_id
            WHERE
                pss.user_id = $1
                AND pb.bucket_id IS NOT NULL
                AND timeout_utc > $2`, [userId, utcNow]);
        if (results.rowCount === 0) {
            return null;
        }

        const dbRow = results.rows[0];
        const bucketId = parseInt(dbRow.bucket_id);
        const bucket = await Bucket.getFromId(phil.bot, phil.db, bucketId);
        if (!bucket) {
            return null;
        }

        const startedUtc = momentModule.utc(dbRow.started_utc);
        const timeoutUtc = momentModule.utc(dbRow.timeout_utc);
        const isAnonymous = (parseInt(dbRow.is_anonymous) === 1);
        const numSubmitted = parseInt(dbRow.num_submitted);
        return new SubmissionSession(userId, bucket, startedUtc, timeoutUtc, isAnonymous,
            numSubmitted);
    }

    static async startNewSession(phil: Phil, userId: string, bucket: Bucket): Promise<SubmissionSession> {
        await phil.db.query(`DELETE FROM prompt_submission_sessions
            WHERE user_id = $1`, [userId]);
        const now = momentModule.utc();
        const timeout = momentModule(now).add(SESSION_LENGTH_IN_MINUTES, 'minutes');
        const results = await phil.db.query(`INSERT INTO
            prompt_submission_sessions(user_id, bucket_id, started_utc, timeout_utc, is_anonymous)
            VALUES($1, $2, $3, $4, E'0')`, [userId, bucket.id, now, timeout]);
        if (results.rowCount !== 1) {
            throw new Error('Unable to begin session in the database.');
        }

        return new SubmissionSession(userId, bucket, now, timeout, false, 0);
    }

    public getNumberSubmissions(): number {
        return this.numSubmitted;
    }

    public getIsAnonymous(): boolean {
        return this.isAnonymous;
    }

    async submit(phil: Phil, prompt: string) {
        const user = phil.bot.users[this.userId];
        const isAnonymousBit = (this.isAnonymous ? 1 : 0);
        const submitPromptResult = await phil.db.query(`INSERT INTO prompts(
                suggesting_user,       suggesting_userid, date_suggested,     prompt_text,
                submitted_anonymously, bucket_id
            )
            VALUES(
                $1,                    $2,                CURRENT_TIMESTAMP,  $3,
                $4,                    $5)`,
            [user.username, this.userId, prompt, isAnonymousBit, this.bucket.id]);
        if (submitPromptResult.rowCount !== 1) {
            throw new Error('Unable to commit the prompt to the database.');
        }

        const updateSessionResult = await phil.db.query(
            `UPDATE prompt_submission_sessions
             SET num_submitted = num_submitted + 1
             WHERE user_id = $1`, [this.userId]);
        if (updateSessionResult.rowCount !== 1) {
            throw new Error('Unable to update the tally for this session in the database.');
        }

        this.numSubmitted++;
    }

    async makeAnonymous(phil: Phil) {
        if (this.isAnonymous) {
            return;
        }

        const updateSessionResult = await phil.db.query(
            `UPDATE prompt_submission_sessions
             SET is_anonymous = E'1'
             WHERE user_id = $1`, [this.userId]);
        if (updateSessionResult.rowCount !== 1) {
            throw new Error('Unable to make this session anonymous in the database.');
        }

        this.isAnonymous = true;
    }

    async end(phil: Phil) {
        await phil.db.query(`DELETE FROM prompt_submission_sessions WHERE user_id = $1`,
            [this.userId]);
    }
}
