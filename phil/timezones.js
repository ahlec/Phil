'use strict';

const discord = require('../promises/discord');

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

function startTimezoneQuestionnaire(bot, userId, db) {
    const notificationMessage = 'Hey! You mentioned some times in your recent message on the server. Would you be willing to tell me what timezone you\'re in so that I can convert them to UTC in the future?';
    console.log(userId);
    return discord.sendMessage(bot, userId, notificationMessage);
}

function startUtcOffsetQuestion(bot, userId, db) {
    const notificationMessage = 'Alright! Let\'s get started! Can you tell me what time it is for you right now?';
    console.log(userId);
    return discord.sendMessage(bot, userId, notificationMessage);
}

function branchStartQuestionnaire(bot, db, userId, manuallyStartedQuestionnaire, canStart) {
    if (!canStart) {
        return false;
    }

    const initialQuestion = (manuallyStartedQuestionnaire ? startUtcOffsetQuestion : startTimezoneQuestionnaire);

    return Promise.resolve()
        .then(() => clearPreviousQuestionnaire(db, userId))
        .then(() => clearPreviousTimezone(db, userId))
        .then(() => initialQuestion(bot, userId))
        .then(() => true);
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
    }
};