import moment = require('moment-timezone');
import Database from '../database';
import { isCurrentlyDoingQuestionnaire } from './questionnaire';
import {
  DeclinedStage,
  FinishedStage,
  getFromNumber,
} from './questionnaire-stages/@all-stages';
import IStage from './questionnaire-stages/@stage';

export default class UserTimezone {
  public static async getForUser(
    db: Database,
    userId: string
  ): Promise<UserTimezone | null> {
    const result = await db.querySingle(
      `SELECT
        timezone_name,
        will_provide,
        stage
      FROM
        timezones
      WHERE
        userid = $1
      LIMIT 1`,
      [userId]
    );

    if (!result) {
      return null;
    }

    return new UserTimezone(userId, result);
  }

  private static determineStage(dbRow: any): IStage {
    const stageNo = parseInt(dbRow.stage, 10);
    return getFromNumber(stageNo);
  }

  public readonly hasProvided: boolean;
  public readonly hasDeclined: boolean;
  public readonly isCurrentlyDoingQuestionnaire: boolean;
  public readonly timezoneName: string | null;

  private constructor(public readonly userId: string, dbRow: any) {
    const stage = UserTimezone.determineStage(dbRow);
    this.hasProvided = stage === FinishedStage;
    this.hasDeclined = stage === DeclinedStage;
    this.isCurrentlyDoingQuestionnaire = isCurrentlyDoingQuestionnaire(stage);

    if (this.hasProvided) {
      this.timezoneName = dbRow.timezone_name;
      if (!this.timezoneName || !this.timezoneName.length) {
        this.timezoneName = null;
      }
    }
  }

  public getHoursApart(otherTimezone: UserTimezone): number {
    if (!this.hasProvided || !this.timezoneName) {
      throw new Error(
        'You cannot get the hours apart if you have not provided a timezone'
      );
    }

    if (!otherTimezone.hasProvided || !otherTimezone.timezoneName) {
      throw new Error('The other timezone has not been provided.');
    }

    const now = moment.utc().valueOf();
    const yourOffset = moment.tz.zone(this.timezoneName)!.utcOffset(now);
    const theirOffset = moment.tz
      .zone(otherTimezone.timezoneName)!
      .utcOffset(now);
    return (yourOffset - theirOffset) / 60;
  }
}
