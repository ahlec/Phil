'use strict';

import { Client as DiscordIOClient } from 'discord.io';
import { Database } from './database';
import { DiscordMessage } from './discord-message';
import { DiscordPromises } from '../promises/discord';

const chronoNode = require('chrono-node');
const countryTimezones = require('../../data/country-timezones.json');
const moment = require('moment-timezone');

interface Timezone {
    readonly name : string;
    readonly displayName : string;
}

interface TimezoneData {
    readonly isCities : boolean;
    readonly timezones : Timezone[];
}

export enum QuestionnaireStage {
    None = 0,
    LetsBegin = 1,
    Country = 2,
    Specification = 3,
    Confirmation = 4,
    Finished = 5,
    Declined = 6
}

export namespace TimezoneQuestionnaire {
    // =================================================
    // Utility functions
    // =================================================

    async function sendStageMessage(bot : DiscordIOClient, db : Database, userId : string, stage : Stage) {
        const message = await stage.getMessage(db, userId);
        return DiscordPromises.sendMessage(bot, userId, message);
    }

    async function setStage(bot : DiscordIOClient, db : Database, userId : string, stage : Stage) {
        const results = await db.query('UPDATE timezones SET stage = $1 WHERE userid = $2', [stage.stage, userId]);
        if (results.rowCount === 0) {
            throw new Error('There were no database records updated when making the database update query call.');
        }

        sendStageMessage(bot, db, userId, stage);
    }

    async function setTimezone(bot : DiscordIOClient, db : Database, userId : string, timezoneName : string) {
        const results = await db.query('UPDATE timezones SET timezone_name = $1 WHERE userid = $2', [timezoneName, userId]);
        if (results.rowCount === 0) {
            throw new Error('Could not update the timezone field in the database.');
        }

        setStage(bot, db, userId, Stages.Confirmation);
    }

    async function canStartQuestionnaire(db : Database, userId : string, manuallyStartedQuestionnaire : boolean) : Promise<boolean> {
        if (manuallyStartedQuestionnaire) {
            // Even if they've previously rejected the questionnaire, if they're manually starting it now, go ahead.
            return true;
        }

        const results = await db.query('SELECT will_provide FROM timezones WHERE userid = $1', [userId]);
        if (results.rowCount === 0) {
            return true;
        }

        if (!results.rows[0].will_provide) {
            return false;
        }

        return true;
    }

    // =================================================
    // Stages
    // =================================================

    interface Stage {
        readonly stage : QuestionnaireStage;
        getMessage(db : Database, userId : string) : Promise<string>;
        processInput(bot : DiscordIOClient, db : Database, message : DiscordMessage) : Promise<any>;
    }

    class LetsBeginStage implements Stage {
        readonly stage = QuestionnaireStage.LetsBegin;

        getMessage(db : Database, userId : string) : Promise<string> {
            return Promise.resolve('Hey! You mentioned some times in your recent message on the server. Would you be willing to tell me what timezone you\'re in so that I can convert them to UTC in the future? Just say `yes` or `no`.');
        }

        async processInput(bot : DiscordIOClient, db : Database, message : DiscordMessage) : Promise<any> {
            const content = message.content.toLowerCase().trim();

            if (content === 'yes') {
                return setStage(bot, db, message.userId, Stages.Country);
            }

            if (content === 'no') {
                const results = await db.query('UPDATE timezones SET will_provide = E\'0\' WHERE userid = $1', [message.userId]);
                if (results.rowCount === 0) {
                    throw new Error('Could not update the will_provide field in the database.');
                }

                setStage(bot, db, message.userId, Stages.Declined);
                return;
            }

            DiscordPromises.sendMessage(bot, message.channelId, 'I didn\'t understand that, sorry. Can you please tell me `yes` or `no` for if you\'d like to fill out the timezone questionnaire?');
        }
    }

    class CountryStage implements Stage {
        readonly stage = QuestionnaireStage.Country;

        getMessage(db : Database, userId : string) : Promise<string> {
            return Promise.resolve('Alright! Let\'s get started! Can you start by telling me the name of the country you\'re in? I\'ll never display this information publicly in the chat.');
        }

        async processInput(bot : DiscordIOClient, db : Database, message : DiscordMessage) : Promise<any> {
            const input = message.content.trim().toLowerCase();
            const timezoneData = countryTimezones[input];

            if (!timezoneData) {
                DiscordPromises.sendMessage(bot, message.channelId, 'I\'m not sure what country that was. I can understand a country by a couple of names, but the easiest is the standard English name of the country.');
                return;
            }

            if (timezoneData.timezones.length === 1) {
                setTimezone(bot, db, message.userId, timezoneData.timezones[0].name);
                return;
            }

            const results = await db.query('UPDATE timezones SET country_name = $1 WHERE userid = $2', [input, message.userId]);
            if (results.rowCount === 0) {
                throw new Error('Could not set the country_name field in the database.');
            }

            setStage(bot, db, message.userId, Stages.Specification);
        }
    }

    class SpecificationStage implements Stage {
        readonly stage = QuestionnaireStage.Specification;

        async getMessage(db : Database, userId : string) : Promise<string> {
            const timezoneData = await this.getTimezoneDataFromCountryDb(db, userId);
            return this.getSpecificationList(timezoneData, 'Okay!');
        }

        async processInput(bot : DiscordIOClient, db : Database, message : DiscordMessage) : Promise<any> {
            const timezoneData = await this.getTimezoneDataFromCountryDb(db, message.userId);
            var input = parseInt(message.content);
            if (isNaN(input)) {
                const reply = this.getSpecificationList(timezoneData, 'Sorry, that wasn\'t actually a number. Can you try again?');
                return DiscordPromises.sendMessage(bot, message.userId, reply);
            }

            input = input - 1; // Front-facing, it's one-based
            if (input < 0 || input >= timezoneData.timezones.length) {
                const reply = this.getSpecificationList(timezoneData, 'That wasn\'t actually a number with a timezone I can understand. Can we try again?');
                return DiscordPromises.sendMessage(bot, message.userId, reply);
            }

            setTimezone(bot, db, message.userId, timezoneData.timezones[input].name);
        }

        private async getTimezoneDataFromCountryDb(db : Database, userId : string) : Promise<TimezoneData> {
            const results = await db.query('SELECT country_name FROM timezones WHERE userid = $1', [userId]);
            return countryTimezones[results.rows[0].country_name] as TimezoneData;
        }

        private getSpecificationList(timezoneData : TimezoneData, prefix : string) : string {
            var message = prefix + ' Your country has a couple of timezones. Please tell me the **number** next to the ';
            if (timezoneData.isCities) {
                message += 'city closest to you that\'s in your timezone';
            } else {
                message += 'timezone that you\'re in';
            }
            message += ':\n\n';

            for (let index = 0; index < timezoneData.timezones.length; ++index) {
                message += '`' + (index + 1) + '`: ' + timezoneData.timezones[index].displayName + '\n';
            }

            message += '\nAgain, just tell me the **number**. It\'s easier that way than making you type out the whole name, y\'know?';
            return message;
        }
    }

    class ConfirmationStage implements Stage {
        readonly stage = QuestionnaireStage.Confirmation;

        getMessage(db : Database, userId : string) : Promise<string> {
            return this.getConfirmationMessage(db, userId, 'Roger!');
        }

        async processInput(bot : DiscordIOClient, db : Database, message : DiscordMessage) : Promise<any> {
            const content = message.content.toLowerCase().trim();

            if (content === 'yes') {
                return setStage(bot, db, message.userId, Stages.Finished);
            }

            if (content === 'no') {
                const results = await db.query('UPDATE timezones SET timezone_name = NULL WHERE userid = $1', [message.userId]);
                if (results.rowCount === 0) {
                    throw new Error('Could not reset the timezone name field in the database.');
                }

                return setStage(bot, db, message.userId, Stages.Country);
            }

            const reply = await this.getConfirmationMessage(db, message.userId, 'Hmmmm, that wasn\'t one of the answers.');
            return DiscordPromises.sendMessage(bot, message.channelId, reply);
        }

        private async getConfirmationMessage(db : Database, userId : string, messagePrefix : string) : Promise<string> {
            const results = await db.query('SELECT timezone_name FROM timezones WHERE userId = $1 LIMIT 1', [userId]);
            const timezoneName = results.rows[0].timezone_name;
            const converted = moment.utc().tz(timezoneName);

            var message = messagePrefix + ' If I understand you correctly, your current time should be **';
            message += converted.format('HH:mm (A) on D MMMM YYYY');
            message += '**. Is this correct? Simply reply with `yes` or `no`.';
            return message;
        }
    }

    class FinishedStage implements Stage {
        readonly stage = QuestionnaireStage.Finished;

        getMessage(db : Database, userId : string) : Promise<string> {
            return Promise.resolve('All done! I\'ve recorded your timezone information! When you mention a date or time in the server again, I\'ll convert it for you! If you ever need to change it, just use `' + process.env.COMMAND_PREFIX + 'timezone` to do so!');
        }

        async processInput(bot : DiscordIOClient, db : Database, message : DiscordMessage) : Promise<any> {
            throw new Error('There is nothing to process when we\'re finished.');
        }
    }

    class DeclinedStage implements Stage {
        readonly stage = QuestionnaireStage.Declined;

        getMessage(db : Database, userId : string) : Promise<string> {
            return Promise.resolve('Understood. I\'ve made a note that you don\'t want to provide this information at this time. I won\'t bother you again. If you ever change your mind, feel free to say `' + process.env.COMMAND_PREFIX + 'timezone` to start up again.');
        }

        async processInput(bot : DiscordIOClient, db : Database, message : DiscordMessage) : Promise<any> {
            throw new Error('There is nothing to process when the user has declined the questionnaire.');
        }
    }

    export const Stages : { [name : string] : Stage } = {
        LetsBegin: new LetsBeginStage(),
        Country: new CountryStage(),
        Specification: new SpecificationStage(),
        Confirmation: new ConfirmationStage(),
        Finished: new FinishedStage(),
        Declined: new DeclinedStage()
    };

    // =================================================
    // Public API
    // =================================================

    export function isCurrentlyDoingQuestionnaire(stage : QuestionnaireStage) : boolean {
        return (stage > QuestionnaireStage.None && stage < QuestionnaireStage.Finished);
    }

    export async function startQuestionnaire(bot : DiscordIOClient, db : Database, userId : string, manuallyStartedQuestionnaire : boolean) : Promise<boolean> {
        const canStart = await canStartQuestionnaire(db, userId, manuallyStartedQuestionnaire);
        if (!canStart) {
            return false;
        }

        await db.query('DELETE FROM timezones WHERE userid = $1', [userId]);

        const initialStage = (manuallyStartedQuestionnaire ? Stages.Country : Stages.LetsBegin);
        const username = bot.users[userId].username;
        await db.query('INSERT INTO timezones(username, userid, stage) VALUES($1, $2, $3)', [username, userId, initialStage.stage]);

        await sendStageMessage(bot, db, userId, initialStage);
        return true;
    }

    export async function getStageForUser(db : Database, userId : string) : Promise<Stage> {
        const results = await db.query('SELECT stage FROM timezones WHERE userid = $1 LIMIT 1', [userId]);
        if (results.rowCount !== 1) {
            throw new Error('This user does not appear to have questionnaire data.');
        }

        const stageNo = parseInt(results.rows[0].stage);
        for (let stageName in Stages) {
            let stage = Stages[stageName];
            if (stage.stage === stageNo) {
                return stage;
            }
        }

        throw new Error('This user appears to be on an invalid stage: ' + stageNo);
    }
}
