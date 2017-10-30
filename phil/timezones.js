'use strict';

const discord = require('../promises/discord');
const QUESTIONNAIRE_STAGES = {
    None: 0,
    LetsBegin: 1,
    UtcOffset: 2,
    DaylightSavingsTime: 3,
    Finished: 4
};

const QUESTIONNAIRE_MESSAGES = [
    '<None>',
    'Hey! You mentioned some times in your recent message on the server. Would you be willing to tell me what timezone you\'re in so that I can convert them to UTC in the future?',
    'Alright! Let\'s get started! Can you tell me what time it is for you right now?',
    'One more question: Are you currently in daylight savings time?',
    'All done! I\'ve recorded your timezone information! When you mention a date or time in the server again, I\'ll convert it for you! If you ever need to change it, just use `' + process.env.COMMAND_PREFIX + 'timezone` to do so!'
];


function processDatabaseTimezoneResults(results) {
    if (results.rowCount === 0) {
        return null;
    }

    return results.rows[0].timezone_name;
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

function clearPreviousTimezone(db, userId) {
    return db.query('DELETE FROM timezones WHERE userid= $1', [userId]);
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
        .then(() => clearPreviousTimezone(db, userId))
        .then(() => insertQuestionnaireDbRow(bot, db, userId, initialStage))
        .then(() => sendStageMessage(bot, userId, initialStage))
        .then(() => true);
}

function processIsCurrentlyDoingQuestionnaireResults(results) {
    if (results.rowCount === 0) {
        return false;
    }

    const currentStage = results.rows[0].stage;
    return (currentStage != QUESTIONNAIRE_STAGES.None && currentStage != QUESTIONNAIRE_STAGES.Finished);
}

module.exports = {
    getTimezoneForUser: function(db, userId) { // results null if nothing, otherwise a timezone
        return db.query('SELECT timezone_name FROM timezones WHERE userid = $1 LIMIT 1', [userId])
            .then(processDatabaseTimezoneResults);
    },

    startQuestionnaire: function(bot, db, userId, manuallyStartedQuestionnaire) { // resolves [true/false] for if it started or not
        return Promise.resolve()
            .then(() => canStartQuestionnaire(db, userId, manuallyStartedQuestionnaire))
            .then(canStart => branchStartQuestionnaire(bot, db, userId, manuallyStartedQuestionnaire, canStart));
    },

    isCurrentlyDoingQuestionnaire: function(db, userId) { // resolves [true/false] for if currently doing questionnaire
        return db.query('SELECT stage FROM timezone_questionnaire WHERE userid = $1 LIMIT 1', [userId])
            .then(processIsCurrentlyDoingQuestionnaireResults);
    }
};