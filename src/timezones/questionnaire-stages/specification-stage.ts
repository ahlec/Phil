import Stage from './@stage';
import { CountryTimezones, TimezoneData } from './@timezone-data';
import { setTimezone } from './@utils';

import Database from '@phil/database';
import ReceivedDirectMessage from '@phil/discord/ReceivedDirectMessage';
import Phil from '@phil/phil';

export default class SpecificationStage implements Stage {
  public readonly stageNumber = 3;

  public async getMessage(db: Database, userId: string): Promise<string> {
    const timezoneData = await this.getTimezoneDataFromCountryDb(db, userId);
    return this.getSpecificationList(timezoneData, 'Okay!');
  }

  public async processInput(
    phil: Phil,
    message: ReceivedDirectMessage
  ): Promise<void> {
    const timezoneData = await this.getTimezoneDataFromCountryDb(
      phil.db,
      message.sender.id
    );
    let input = parseInt(message.body, 10);
    if (isNaN(input)) {
      const reply = this.getSpecificationList(
        timezoneData,
        "Sorry, that wasn't actually a number. Can you try again?"
      );
      await message.respond({
        text: reply,
        type: 'plain',
      });
      return;
    }

    input = input - 1; // Front-facing, it's one-based
    if (input < 0 || input >= timezoneData.timezones.length) {
      const reply = this.getSpecificationList(
        timezoneData,
        "That wasn't actually a number with a timezone I can understand. Can we try again?"
      );
      await message.respond({
        text: reply,
        type: 'plain',
      });
      return;
    }

    setTimezone(phil.db, message.sender, timezoneData.timezones[input].name);
  }

  private async getTimezoneDataFromCountryDb(
    db: Database,
    userId: string
  ): Promise<TimezoneData> {
    const results = await db.query<{ country_name: string }>(
      'SELECT country_name FROM timezones WHERE userid = $1',
      [userId]
    );
    return CountryTimezones[results.rows[0].country_name];
  }

  private getSpecificationList(
    timezoneData: TimezoneData,
    prefix: string
  ): string {
    let message =
      prefix +
      ' Your country has a couple of timezones. Please tell me the **number** next to the ';
    if (timezoneData.isCities) {
      message += "city closest to you that's in your timezone";
    } else {
      message += "timezone that you're in";
    }
    message += ':\n\n';

    for (let index = 0; index < timezoneData.timezones.length; ++index) {
      message +=
        '`' +
        (index + 1) +
        '`: ' +
        timezoneData.timezones[index].displayName +
        '\n';
    }

    message +=
      "\nAgain, just tell me the **number**. It's easier that way than making you type out the whole name, y'know?";
    return message;
  }
}
