import { CountryStage, DeclinedStage } from './@all-stages';
import IStage from './@stage';
import { setStage } from './@utils';

import Database from '../../database';
import PrivateMessage from '../../messages/private';
import Phil from '../../phil';
import { sendMessage } from '../../promises/discord';

export default class LetsBeginStage implements IStage {
  public readonly stageNumber = 1;

  public async getMessage(db: Database, userId: string): Promise<string> {
    return 'Hey! You mentioned some times in your recent message on the server. Would you be willing to tell me what timezone you\'re in so that I can convert them to UTC in the future? Just say `yes` or `no`.';
  }

  public async processInput(phil: Phil, message: PrivateMessage): Promise<any> {
    const content = message.content.toLowerCase().trim();

    if (content === 'yes') {
      return setStage(phil, message.userId, CountryStage);
    }

    if (content === 'no') {
      const results = await phil.db.query(
        "UPDATE timezones SET will_provide = E'0' WHERE userid = $1",
        [message.userId]
      );
      if (results.rowCount === 0) {
        throw new Error(
          'Could not update the will_provide field in the database.'
        );
      }

      setStage(phil, message.userId, DeclinedStage);
      return;
    }

    sendMessage(
      phil.bot,
      message.channelId,
      "I didn't understand that, sorry. Can you please tell me `yes` or `no` for if you'd like to fill out the timezone questionnaire?"
    );
  }
}
