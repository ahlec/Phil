'use strict';

const discord = require('../promises/discord');
const chronoNode = require('chrono-node');

const QUESTIONNAIRE_STAGES = {
    None: 0,
    LetsBegin: 1,
    UtcOffset: 2,
    DaylightSavingsTime: 3,
    Finished: 4,
    Declined: 5
};

const QUESTIONNAIRE_MESSAGES = [
    '<None>',
    'Hey! You mentioned some times in your recent message on the server. Would you be willing to tell me what timezone you\'re in so that I can convert them to UTC in the future? Just say `yes` or `no`.',
    'Alright! Let\'s get started! Can you tell me what your UTC offset is? It\'ll be something like `UTC-5:00` or `GMT+12:00` or `+9:30`. You can check https://whatismytimezone.com/ to find out quickly enough.',
    'One more question: Are you in the United States? I\'m just asking to know if I should consider daylight savings time - that\'s all. Just a simple `yes` or `no` is good here.',
    'All done! I\'ve recorded your timezone information! When you mention a date or time in the server again, I\'ll convert it for you! If you ever need to change it, just use `' + process.env.COMMAND_PREFIX + 'timezone` to do so!',
    'Understood. I\'ve made a note that you don\'t want to provide this information at this time. I won\'t bother you again. If you ever change your mind, feel free to say `' + process.env.COMMAND_PREFIX + 'timezone` to start up again.'
];


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

    return db.query('SELECT will_provide FROM timezone_questionnaire WHERE userid = $1', [userId])
        .then(interpretCanStartDbResult);
}

function clearPreviousQuestionnaire(db, userId) {
    return db.query('DELETE FROM timezone_questionnaire WHERE userid = $1', [userId]);
}

function insertQuestionnaireDbRow(bot, db, userId, initialStage) {
    const username = bot.users[userId].username;
    return db.query('INSERT INTO timezone_questionnaire(username, userid, stage) VALUES($1, $2, $3)', [username, userId, initialStage]);
}

function sendStageMessage(bot, userId, stage) {
    const message = QUESTIONNAIRE_MESSAGES[stage];
    if (!message || message.length === 0) {
        return Promise.reject('There was no message defined for questionnaire stage `' + stage + '`.');
    }
    
    return discord.sendMessage(bot, userId, message);
}

function branchStartQuestionnaire(bot, db, userId, manuallyStartedQuestionnaire, canStart) {
    if (!canStart) {
        return false;
    }

    const initialStage = (manuallyStartedQuestionnaire ? QUESTIONNAIRE_STAGES.UtcOffset : QUESTIONNAIRE_STAGES.LetsBegin);

    return Promise.resolve()
        .then(() => clearPreviousQuestionnaire(db, userId))
        .then(() => insertQuestionnaireDbRow(bot, db, userId, initialStage))
        .then(() => sendStageMessage(bot, userId, initialStage))
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
    return db.query('UPDATE timezone_questionnaire SET stage = $1 WHERE userid = $2', [stage, userId])
        .then(ensureRowWasModified)
        .then(() => sendStageMessage(bot, userId, stage));
}

function processLetsBeginStage(bot, db, message) {
    const content = message.content.toLowerCase().trim();

    if (content === 'yes') {
        return setStage(bot, db, message.userId, QUESTIONNAIRE_STAGES.UtcOffset);
    }
    
    if (content === 'no') {
        return db.query('UPDATE timezone_questionnaire SET will_provide = E\'0\' WHERE userid = $1', [message.userId])
            .then(ensureRowWasModified)
            .then(setStage(bot, db, message.userId, QUESTIONNAIRE_STAGES.Declined));
    }

    return discord.sendMessage(bot, message.channelId, 'I didn\'t understand that, sorry. Can you please tell me `yes` or `no` for if you\'d like to fill out the timezone questionnaire?');
}

function parseUtcOffset(text) {
    if (!text || text.length === 0) {
        return null;
    }

    text = text.trim().toLowerCase();
    const utcRegex = /^\s*(utc|gmt)?\s*((\+|\-)\0?[0-9](:(0|3)0)?)\s*$/i; // Group #2 will be the entire offset, +4:00 or -12:00 or -7
    const matches = utcRegex.exec(text);

    if (!matches) {
        return null;
    }

    var utcOffset = matches[2];

    if (utcOffset.indexOf(':') < 0) {
        utcOffset += ':00';
    }

    return utcOffset;
}

function processUtcOffsetStage(bot, db, message) {
    const utcOffset = parseUtcOffset(message.content);

    if (!utcOffset) {
        return discord.sendMessage(bot, message.channelId, 'I\'m not sure I understood that. Could you tell me your UTC offset, like `UTC-05:00` or `+12:30`?');
    }

    return db.query('UPDATE timezone_questionnaire SET utc_offset = $1 WHERE userid = $2', [utcOffset, message.userId])
        .then(ensureRowWasModified)
        .then(setStage(bot, db, message.userId, QUESTIONNAIRE_STAGES.DaylightSavingsTime));
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
        case QUESTIONNAIRE_STAGES.UtcOffset:
        {
            return processUtcOffsetStage(bot, db, message);
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
        return db.query('SELECT will_provide FROM timezone_questionnaire WHERE userid = $1 LIMIT 1', [userId])
            .then(processDeclinedProvidingResults);
    },

    startQuestionnaire: function(bot, db, userId, manuallyStartedQuestionnaire) { // resolves [true/false] for if it started or not
        return Promise.resolve()
            .then(() => canStartQuestionnaire(db, userId, manuallyStartedQuestionnaire))
            .then(canStart => branchStartQuestionnaire(bot, db, userId, manuallyStartedQuestionnaire, canStart));
    },

    isCurrentlyDoingQuestionnaire: function(db, userId) { // resolves [true/false] for if currently doing questionnaire
        return db.query('SELECT stage FROM timezone_questionnaire WHERE userid = $1 LIMIT 1', [userId])
            .then(processIsCurrentlyDoingQuestionnaireResults);
    },

    processQuestionnaireMessage: function(bot, db, message) {
        return db.query('SELECT stage FROM timezone_questionnaire WHERE userid = $1 LIMIT 1', [message.userId])
            .then(results => processQuestionnaireStage(bot, db, message, results));
    }
};