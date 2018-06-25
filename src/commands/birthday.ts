import { Moment } from 'moment';
import Database from '../database';
import Feature from '../features/feature';
import { HelpGroup } from '../help-groups';
import PublicMessage from '../messages/public';
import Phil from '../phil';
import ServerConfig from '../server-config';
import BotUtils from '../utils';
import ICommand from './@types';

import chronoNode = require('chrono-node');
import momentModuleFunc = require('moment');

export default class BirthdayCommand implements ICommand {
    public readonly name = 'birthday';
    public readonly aliases: ReadonlyArray<string> = [];
    public readonly feature: Feature = null;

    public readonly helpGroup = HelpGroup.General;
    public readonly helpDescription = 'Tell Phil when your birthday is so he can share your birthday with the server.';

    public readonly versionAdded = 5;

    public readonly isAdminCommand = false;
    public async processMessage(phil: Phil, message: PublicMessage, commandArgs: ReadonlyArray<string>): Promise<any> {
        const birthday = this.getInputFromCommandArgs(message.serverConfig, commandArgs);

        await this.setBirthdayInDatabase(phil.db, message.user.username, message.userId, birthday);

        const reply = 'I\'ve updated your birthday to be ' + birthday.format('D MMMM') +
            '! Thank you! If I made a mistake, however, feel free to tell me your birthday again!';
        BotUtils.sendSuccessMessage({
            bot: phil.bot,
            channelId: message.channelId,
            message: reply
        });
    }

    private getInputFromCommandArgs(serverConfig: ServerConfig, commandArgs: ReadonlyArray<string>): Moment {
        const birthdayInput = commandArgs.join(' ').trim();
        if (birthdayInput.length === 0) {
            throw new Error('Please tell me what your birthday is, like `' + serverConfig.commandPrefix + 'birthday 05 December`.');
        }

        const birthday = chronoNode.parseDate(birthdayInput);
        if (!birthday || birthday === null) {
            throw new Error('I couldn\'t figure out how to understand `' + birthdayInput + '`. Could you try again?');
        }

        return momentModuleFunc(birthday);
    }

    private async setBirthdayInDatabase(db: Database, username: string, userId: string, birthday: Moment) {
        const day = birthday.date();
        const month = birthday.month() + 1;

        const updateResults = await db.query(`UPDATE birthdays
            SET birthday_day = $1, birthday_month = $2
            WHERE userid = $3`, [day, month, userId]);
        if (updateResults.rowCount >= 1) {
            return;
        }

        const insertResults = await db.query(`INSERT INTO
            birthdays(username, userid, birthday_day, birthday_month)
            VALUES($1, $2, $3, $4)`, [username, userId, day, month]);
        if (insertResults.rowCount >= 1) {
            return;
        }

        throw new Error('Unable to update or insert into the database');
    }
}
