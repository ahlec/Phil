import { CountryStage, FinishedStage } from './@all-stages';
import IStage from './@stage';
import { setStage } from './@utils';

import Database from '@phil/database';
import PrivateMessage from '@phil/messages/private';
import Phil from '@phil/phil';
import { sendMessage } from '@phil/promises/discord';

import * as moment from 'moment-timezone';

export default class ConfirmationStage implements IStage {
  public readonly stageNumber = 4;

  public getMessage(db: Database, userId: string): Promise<string> {
    return this.getConfirmationMessage(db, userId, 'Roger!');
  }

  public async processInput(
    phil: Phil,
    message: PrivateMessage
  ): Promise<void> {
    const content = message.content.toLowerCase().trim();

    if (content === 'yes') {
      await setStage(phil, message.userId, FinishedStage);
      return;
    }

    if (content === 'no') {
      const results = await phil.db.query<{ timezones: string }>(
        'UPDATE timezones SET timezone_name = NULL WHERE userid = $1',
        [message.userId]
      );
      if (results.rowCount === 0) {
        throw new Error(
          'Could not reset the timezone name field in the database.'
        );
      }

      await setStage(phil, message.userId, CountryStage);
      return;
    }

    const reply = await this.getConfirmationMessage(
      phil.db,
      message.userId,
      "Hmmmm, that wasn't one of the answers."
    );
    await sendMessage(phil.bot, message.channelId, reply);
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
