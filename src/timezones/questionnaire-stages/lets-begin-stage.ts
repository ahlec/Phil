import { CountryStage, DeclinedStage } from './@all-stages';
import Stage from './@stage';
import { setStage } from './@utils';

import ReceivedDirectMessage from '@phil/discord/ReceivedDirectMessage';
import Phil from '@phil/phil';

export default class LetsBeginStage implements Stage {
  public readonly stageNumber = 1;

  public async getMessage(): Promise<string> {
    return "Hey! You mentioned some times in your recent message on the server. Would you be willing to tell me what timezone you're in so that I can convert them to UTC in the future? Just say `yes` or `no`.";
  }

  public async processInput(
    phil: Phil,
    message: ReceivedDirectMessage
  ): Promise<void> {
    const content = message.body.toLowerCase().trim();

    if (content === 'yes') {
      await setStage(phil.db, message.sender, CountryStage);
      return;
    }

    if (content === 'no') {
      const results = await phil.db.query<{ timezones: string }>(
        "UPDATE timezones SET will_provide = E'0' WHERE userid = $1",
        [message.sender.id]
      );
      if (results.rowCount === 0) {
        throw new Error(
          'Could not update the will_provide field in the database.'
        );
      }

      await setStage(phil.db, message.sender, DeclinedStage);
      return;
    }

    await message.respond({
      text:
        "I didn't understand that, sorry. Can you please tell me `yes` or `no` for if you'd like to fill out the timezone questionnaire?",
      type: 'plain',
    });
  }
}
