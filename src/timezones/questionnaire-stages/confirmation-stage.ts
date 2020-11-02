import { CountryStage, FinishedStage } from './@all-stages';
import IStage from './@stage';
import { setStage } from './@utils';

import Database from '@phil/database';
import ReceivedDirectMessage from '@phil/discord/ReceivedDirectMessage';
import Phil from '@phil/phil';

import * as moment from 'moment-timezone';

export default class ConfirmationStage implements IStage {
  public readonly stageNumber = 4;

  public getMessage(db: Database, userId: string): Promise<string> {
    return this.getConfirmationMessage(db, userId, 'Roger!');
  }

  public async processInput(
    phil: Phil,
    message: ReceivedDirectMessage
  ): Promise<void> {
    const content = message.body.toLowerCase().trim();

    if (content === 'yes') {
      await setStage(phil.db, message.sender, FinishedStage);
      return;
    }

    if (content === 'no') {
      const results = await phil.db.query<{ timezones: string }>(
        'UPDATE timezones SET timezone_name = NULL WHERE userid = $1',
        [message.sender.id]
      );
      if (results.rowCount === 0) {
        throw new Error(
          'Could not reset the timezone name field in the database.'
        );
      }

      await setStage(phil.db, message.sender, CountryStage);
      return;
    }

    const reply = await this.getConfirmationMessage(
      phil.db,
      message.sender.id,
      "Hmmmm, that wasn't one of the answers."
    );
    await message.respond({
      text: reply,
      type: 'plain',
    });
  }

  private async getConfirmationMessage(
    db: Database,
    userId: string,
    messagePrefix: string
  ): Promise<string> {
    const results = await db.query<{ timezone_name: string }>(
      'SELECT timezone_name FROM timezones WHERE userId = $1 LIMIT 1',
      [userId]
    );
    const timezoneName = results.rows[0].timezone_name;
    const converted = moment.utc().tz(timezoneName);

    let message =
      messagePrefix +
      ' If I understand you correctly, your current time should be **';
    message += converted.format('HH:mm (A) on D MMMM YYYY');
    message += '**. Is this correct? Simply reply with `yes` or `no`.';
    return message;
  }
}
