import * as chronoNode from 'chrono-node';
import * as moment from 'moment';
import Database from '../database';
import PublicMessage from '../messages/public';
import Phil from '../phil';
import ServerConfig from '../server-config';
import { sendSuccessMessage } from '../utils';
import Command, { LoggerDefinition } from './@types';

export default class BirthdayCommand extends Command {
  public constructor(parentDefinition: LoggerDefinition) {
    super('birthday', parentDefinition, {
      helpDescription:
        'Tell Phil when your birthday is so he can share your birthday with the server.',
      versionAdded: 5,
    });
  }

  public async processMessage(
    phil: Phil,
    message: PublicMessage,
    commandArgs: ReadonlyArray<string>
  ): Promise<any> {
    const birthday = this.getInputFromCommandArgs(
      message.serverConfig,
      commandArgs
    );

    await this.setBirthdayInDatabase(
      phil.db,
      message.user.username,
      message.userId,
      birthday
    );

    const reply =
      "I've updated your birthday to be " +
      birthday.format('D MMMM') +
      '! Thank you! If I made a mistake, however, feel free to tell me your birthday again!';
    sendSuccessMessage({
      bot: phil.bot,
      channelId: message.channelId,
      message: reply,
    });
  }

  private getInputFromCommandArgs(
    serverConfig: ServerConfig,
    commandArgs: ReadonlyArray<string>
  ): moment.Moment {
    const birthdayInput = commandArgs.join(' ').trim();
    if (birthdayInput.length === 0) {
      throw new Error(
        'Please tell me what your birthday is, like `' +
          serverConfig.commandPrefix +
          'birthday 05 December`.'
      );
    }

    const birthday = chronoNode.parseDate(birthdayInput);
    if (!birthday || birthday === null) {
      throw new Error(
        "I couldn't figure out how to understand `" +
          birthdayInput +
          '`. Could you try again?'
      );
    }

    return moment(birthday);
  }

  private async setBirthdayInDatabase(
    db: Database,
    username: string,
    userId: string,
    birthday: moment.Moment
  ) {
    const day = birthday.date();
    const month = birthday.month() + 1;

    const updateResults = await db.query(
      `UPDATE birthdays
            SET birthday_day = $1, birthday_month = $2
            WHERE userid = $3`,
      [day, month, userId]
    );
    if (updateResults.rowCount >= 1) {
      return;
    }

    const insertResults = await db.query(
      `INSERT INTO
            birthdays(username, userid, birthday_day, birthday_month)
            VALUES($1, $2, $3, $4)`,
      [username, userId, day, month]
    );
    if (insertResults.rowCount >= 1) {
      return;
    }

    throw new Error('Unable to update or insert into the database');
  }
}
