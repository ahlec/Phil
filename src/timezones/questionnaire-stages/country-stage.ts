import { SpecificationStage } from './@all-stages';
import Stage from './@stage';
import { CountryTimezones } from './@timezone-data';
import { setStage, setTimezone } from './@utils';

import ReceivedDirectMessage from '@phil/discord/ReceivedDirectMessage';
import Phil from '@phil/phil';

export default class CountryStage implements Stage {
  public readonly stageNumber = 2;

  public async getMessage(): Promise<string> {
    return "Alright! Let's get started! Can you start by telling me the name of the country you're in? I'll never display this information publicly in the chat.";
  }

  public async processInput(
    phil: Phil,
    message: ReceivedDirectMessage
  ): Promise<void> {
    const input = message.body.trim().toLowerCase();
    const timezoneData = CountryTimezones[input];

    if (!timezoneData) {
      await message.respond({
        type: 'plain',
        text:
          "I'm not sure what country that was. I can understand a country by a couple of names, but the easiest is the standard English name of the country.",
      });
      return;
    }

    if (timezoneData.timezones.length === 1) {
      await setTimezone(
        phil.db,
        message.sender,
        timezoneData.timezones[0].name
      );
      return;
    }

    const results = await phil.db.query<{ timezones: string }>(
      'UPDATE timezones SET country_name = $1 WHERE userid = $2',
      [input, message.sender.id]
    );
    if (results.rowCount === 0) {
      throw new Error('Could not set the country_name field in the database.');
    }

    await setStage(phil.db, message.sender, SpecificationStage);
  }
}
