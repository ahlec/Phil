'use strict';

const discord = require('../promises/discord');
const chronoNode = require('chrono-node');
const countryTimezones = require('../data/country-timezones.json');

const QUESTIONNAIRE_STAGES = {
    None: 0,
    LetsBegin: 1,
    Country: 2,
    Specification: 3,
    Confirmation: 4,
    Finished: 5,
    Declined: 6
};

function processDatabaseTimezoneResults(results) {
    if (results.rowCount === 0) {
        return null;
    }

    return results.rows[0].timezone_name;
}

function processDeclinedProvidingResults(results) {
    if (results.rowCount === 0) {
        return false;
    }

    if (results.rows[0].will_provide == 0) {
        return true;
    }

    return false;
}

function interpretCanStartDbResult(result) {
    if (result.rowCount === 0) {
        return true;
    }

    if (!result.rows[0].will_provide) {
        return false;
    }

    return true;
}

function canStartQuestionnaire(db, userId, manuallyStartedQuestionnaire) {
    if (manuallyStartedQuestionnaire) {
        // Even if they've previously rejected the questionnaire, if they're manually starting it now, go ahead.
        return true;
    }

    return db.query('SELECT will_provide FROM timezones WHERE userid = $1', [userId])
        .then(interpretCanStartDbResult);
}

function clearPreviousData(db, userId) {
    return db.query('DELETE FROM timezones WHERE userid = $1', [userId]);
}

function insertNewTimezoneRow(bot, db, userId, initialStage) {
    const username = bot.users[userId].username;
    return db.query('INSERT INTO timezones(username, userid, stage) VALUES($1, $2, $3)', [username, userId, initialStage]);
}

function buildSpecificationListFromCountryTimezones(timezoneData) {
    var message = 'Okay! Your country has a couple of timezones. Please tell me the **number** next to the ';
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

const GetQuestionnaireStageMessageFuncs = {};
GetQuestionnaireStageMessageFuncs[QUESTIONNAIRE_STAGES.None] = function(db, userId) {
    return Promise.resolve('<None>');
};
GetQuestionnaireStageMessageFuncs[QUESTIONNAIRE_STAGES.LetsBegin] = function(db, userId) {
    return Promise.resolve('Hey! You mentioned some times in your recent message on the server. Would you be willing to tell me what timezone you\'re in so that I can convert them to UTC in the future? Just say `yes` or `no`.');
};
GetQuestionnaireStageMessageFuncs[QUESTIONNAIRE_STAGES.Country] = function(db, userId) {
    return Promise.resolve('Alright! Let\'s get started! Can you start by telling me the name of the country you\'re in? I\'ll never display this information publicly in the chat.');
};
GetQuestionnaireStageMessageFuncs[QUESTIONNAIRE_STAGES.Specification] = function(db, userId) {
    return db.query('SELECT country_name FROM timezones WHERE userid = $1', [userId])
        .then(results => countryTimezones[results.rows[0].country_name])
        .then(buildSpecificationListFromCountryTimezones);
};
GetQuestionnaireStageMessageFuncs[QUESTIONNAIRE_STAGES.Confirmation] = function(db, userId) {
    return null;
};
GetQuestionnaireStageMessageFuncs[QUESTIONNAIRE_STAGES.Finished] = function(db, userId) {
    return Promise.resolve('All done! I\'ve recorded your timezone information! When you mention a date or time in the server again, I\'ll convert it for you! If you ever need to change it, just use `' + process.env.COMMAND_PREFIX + 'timezone` to do so!');
};
GetQuestionnaireStageMessageFuncs[QUESTIONNAIRE_STAGES.Declined] = function(db, userId) {
    return Promise.resolve('Understood. I\'ve made a note that you don\'t want to provide this information at this time. I won\'t bother you again. If you ever change your mind, feel free to say `' + process.env.COMMAND_PREFIX + 'timezone` to start up again.');
};

function sendStageMessage(bot, db, userId, stage) {
    const messageFunc = GetQuestionnaireStageMessageFuncs[stage];
    if (!messageFunc) {
        return Promise.reject('There was no message function defined for questionnaire stage `' + stage + '`.');
    }

    return messageFunc(db, userId)
        .then(message => discord.sendMessage(bot, userId, message));
}

function branchStartQuestionnaire(bot, db, userId, manuallyStartedQuestionnaire, canStart) {
    if (!canStart) {
        return false;
    }

    const initialStage = (manuallyStartedQuestionnaire ? QUESTIONNAIRE_STAGES.Country : QUESTIONNAIRE_STAGES.LetsBegin);

    return Promise.resolve()
        .then(() => clearPreviousData(db, userId))
        .then(() => insertNewTimezoneRow(bot, db, userId, initialStage))
        .then(() => sendStageMessage(bot, db, userId, initialStage))
        .then(() => true);
}

function processIsCurrentlyDoingQuestionnaireResults(results) {
    if (results.rowCount === 0) {
        return false;
    }

    const currentStage = results.rows[0].stage;
    return (currentStage != QUESTIONNAIRE_STAGES.None && currentStage != QUESTIONNAIRE_STAGES.Finished && currentStage != QUESTIONNAIRE_STAGES.Declined);
}

function ensureRowWasModified(results) {
    if (results.rowCount === 0) {
        return Promise.reject('There were no database records updated when making the database update query call.');
    }
}

function setStage(bot, db, userId, stage) {
    return db.query('UPDATE timezones SET stage = $1 WHERE userid = $2', [stage, userId])
        .then(ensureRowWasModified)
        .then(() => sendStageMessage(bot, db, userId, stage));
}

function processLetsBeginStage(bot, db, message) {
    const content = message.content.toLowerCase().trim();

    if (content === 'yes') {
        return setStage(bot, db, message.userId, QUESTIONNAIRE_STAGES.Country);
    }

    if (content === 'no') {
        return db.query('UPDATE timezones SET will_provide = E\'0\' WHERE userid = $1', [message.userId])
            .then(ensureRowWasModified)
            .then(setStage(bot, db, message.userId, QUESTIONNAIRE_STAGES.Declined));
    }

    return discord.sendMessage(bot, message.channelId, 'I didn\'t understand that, sorry. Can you please tell me `yes` or `no` for if you\'d like to fill out the timezone questionnaire?');
}

function processCountryStage(bot, db, message) {
    const input = message.content.trim().toLowerCase();
    const timezoneData = countryTimezones[input];

    if (!timezoneData) {
        return discord.sendMessage(bot, message.channelId, 'I\'m not sure what country that was. I can understand a country by a couple of names, but the easiest is the standard English name of the country.');
    }

    if (timezoneData.timezones.length === 1) {
        const timezoneName = timezoneData.timezones[0].name;
        return db.query('UPDATE timezones SET timezone_name = $1 WHERE userid = $2', [timezoneName, message.userId])
            .then(ensureRowWasModified)
            .then(setStage(bot, db, message.userId, QUESTIONNAIRE_STAGES.Confirmation));
    }

    return db.query('UPDATE timezones SET country_name = $1 WHERE userid = $2', [input, message.userId])
        .then(ensureRowWasModified)
        .then(setStage(bot, db, message.userId, QUESTIONNAIRE_STAGES.Specification));
}

function processDaylightSavingStage(bot, db, message) {
    const response = message.content.toLowerCase().trim();

    var isInUnitedStates;
    if (response === 'yes') {
        isInUnitedStates = 1;
    } else if (response === 'no') {
        isInUnitedStates = 0;
    } else {
        return discord.sendMessage(bot, message.channelId, 'I didn\'t quite catch that. Are you in the United States or not? `Yes` or `no` is good enough.');
    }

    return db.query('UPDATE timezone_questionnaire SET is_united_states = $1 WHERE userid = $2', [isInUnitedStates, message.userId])
        .then(ensureRowWasModified)
        .then(setStage(bot, db, message.userId, QUESTIONNAIRE_STAGES.Finished));
}

function processQuestionnaireStage(bot, db, message, results) {
    if (!processIsCurrentlyDoingQuestionnaireResults(results)) {
        return Promise.reject('Not currently in the middle of a timezone questionnaire!');
    }

    const currentStage = results.rows[0].stage;

    switch (currentStage) {
        case QUESTIONNAIRE_STAGES.LetsBegin:
        {
            return processLetsBeginStage(bot, db, message);
        }
        case QUESTIONNAIRE_STAGES.Country:
        {
            return processCountryStage(bot, db, message);
        }
        case QUESTIONNAIRE_STAGES.DaylightSavingsTime:
        {
            return processDaylightSavingStage(bot, db, message);
        }
    }

    return Promise.reject('Unknown questionnaire stage \'' + currentStage + '\'');
}

module.exports = {
    getTimezoneForUser: function(db, userId) { // results null if nothing, otherwise a timezone
        //return db.query('SELECT timezone_name FROM timezones WHERE userid = $1 LIMIT 1', [userId])
        //    .then(processDatabaseTimezoneResults);
        return Promise.resolve(null);
    },

    hasDeclinedProvidingTimezone: function(db, userId) { // resolves [true/false] for if the user has declined to provide their timezone
        return db.query('SELECT will_provide FROM timezones WHERE userid = $1 LIMIT 1', [userId])
            .then(processDeclinedProvidingResults);
    },

    startQuestionnaire: function(bot, db, userId, manuallyStartedQuestionnaire) { // resolves [true/false] for if it started or not
        return Promise.resolve()
            .then(() => canStartQuestionnaire(db, userId, manuallyStartedQuestionnaire))
            .then(canStart => branchStartQuestionnaire(bot, db, userId, manuallyStartedQuestionnaire, canStart));
    },

    isCurrentlyDoingQuestionnaire: function(db, userId) { // resolves [true/false] for if currently doing questionnaire
        return db.query('SELECT stage FROM timezones WHERE userid = $1 LIMIT 1', [userId])
            .then(processIsCurrentlyDoingQuestionnaireResults);
    },

    processQuestionnaireMessage: function(bot, db, message) {
        return db.query('SELECT stage FROM timezones WHERE userid = $1 LIMIT 1', [message.userId])
            .then(results => processQuestionnaireStage(bot, db, message, results));
    }
};
