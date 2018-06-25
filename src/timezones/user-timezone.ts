import Database from 'database';
import moment = require('moment-timezone');
import { QueryResult } from 'pg';
import TimezoneQuestionnaire from './questionnaire';
import Stages from './questionnaire-stages/@all-stages';
import IStage from './questionnaire-stages/@stage';

export default class UserTimezone {
    public static async getForUser(db: Database, userId: string): Promise<UserTimezone> {
        const results = await db.query(`SELECT
            timezone_name, will_provide, stage
            FROM timezones
            WHERE userid = $1 LIMIT 1`, [userId]);
        return new UserTimezone(userId, results);
    }

    private static determineStage(results: QueryResult): IStage {
        const stageNo = parseInt(results.rows[0].stage, 10);
        return Stages.getFromNumber(stageNo);
    }

    public readonly hasProvided: boolean;
    public readonly hasDeclined: boolean;
    public readonly isCurrentlyDoingQuestionnaire: boolean;
    public readonly timezoneName: string;

    private constructor(public readonly userId: string, results: QueryResult) {
        const stage = UserTimezone.determineStage(results);
        this.hasProvided = (stage === Stages.Finished);
        this.hasDeclined = (stage === Stages.Declined);
        this.isCurrentlyDoingQuestionnaire = TimezoneQuestionnaire.isCurrentlyDoingQuestionnaire(stage);

        if (this.hasProvided) {
            this.timezoneName = results.rows[0].timezone_name;
            if (!this.timezoneName || !this.timezoneName.length) {
                this.timezoneName = null;
            }
        }
    }

    public getHoursApart(otherTimezone: UserTimezone): number {
        const now = moment.utc().valueOf();
        const yourOffset = moment.tz.zone(this.timezoneName).utcOffset(now);
        const theirOffset = moment.tz.zone(otherTimezone.timezoneName).utcOffset(now);
        return (yourOffset - theirOffset) / 60;
    }
}
