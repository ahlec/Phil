'use strict';

import { Database } from './database';
import { QueryResult } from 'pg';
import { QuestionnaireStage, TimezoneQuestionnaire } from './timezone-questionnaire';
import moment = require('moment-timezone');

export class UserTimezone {
    public readonly hasProvided : boolean;
    public readonly hasDeclined : boolean;
    public readonly isCurrentlyDoingQuestionnaire : boolean;
    public readonly timezoneName : string;

    private constructor(public readonly userId : string, results : QueryResult) {
        const stage = UserTimezone.determineStage(results);
        this.hasProvided = (stage === QuestionnaireStage.Finished);
        this.hasDeclined = (stage === QuestionnaireStage.Declined);
        this.isCurrentlyDoingQuestionnaire = TimezoneQuestionnaire.isCurrentlyDoingQuestionnaire(stage);

        if (this.hasProvided) {
            this.timezoneName = results.rows[0].timezone_name;
            if (!this.timezoneName || !this.timezoneName.length) {
                this.timezoneName = null;
            }
        }
    }

    public static async getForUser(db : Database, userId : string) : Promise<UserTimezone> {
        const results = await db.query(`SELECT
            timezone_name, will_provide, stage
            FROM timezones
            WHERE userid = $1 LIMIT 1`, [userId]);
        return new UserTimezone(userId, results);
    }

    static determineStage(results : QueryResult) : QuestionnaireStage {
        if (results.rowCount !== 1) {
            return QuestionnaireStage.None;
        }

        const stage = parseInt(results.rows[0].stage);
        return stage;
    }

    getHoursApart(otherTimezone : UserTimezone) : number {
        const now = moment.utc().valueOf();
        const yourOffset = moment.tz.zone(this.timezoneName).utcOffset(now);
        const theirOffset = moment.tz.zone(otherTimezone.timezoneName).utcOffset(now);
        return (yourOffset - theirOffset) / 60;
    }
}
