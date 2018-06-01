'use strict';

import { Command } from './@types';
import { Phil } from '../phil/phil';
import { Database } from '../phil/database';
import { HelpGroup } from '../phil/help-groups';
import { IPublicMessage, IServerConfig } from 'phil';
import { BotUtils } from '../phil/utils';
import { DiscordPromises } from '../promises/discord';
import { Feature } from '../phil/features';
import { Moment } from 'moment';
import chronoNode = require('chrono-node');
import momentModuleFunc = require('moment');

export class BirthdayCommand implements Command {
    readonly name = 'birthday';
    readonly aliases : string[] = [];
    readonly feature : Feature = null;

    readonly helpGroup = HelpGroup.General;
    readonly helpDescription = 'Tell Phil when your birthday is so he can share your birthday with the server.';

    readonly versionAdded = 5;

    readonly publicRequiresAdmin = false;
    async processPublicMessage(phil : Phil, message : IPublicMessage, commandArgs : string[]) : Promise<any> {
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

    getInputFromCommandArgs(serverConfig : IServerConfig, commandArgs : string[]) : Moment {
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

    async setBirthdayInDatabase(db : Database, username : string, userId : string, birthday : Moment) {
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
