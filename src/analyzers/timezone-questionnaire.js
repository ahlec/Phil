'use strict';

const timezones = require('../phil/timezones');

function branchDoingQuestionnaire(bot, db, message, isDoingQuestionnaire) {
    if (!isDoingQuestionnaire) {
        return;
    }

    return timezones.processQuestionnaireMessage(bot, db, message);
}

module.exports = function(bot, message, db) {
    if (!message.isDirectMessage) {
        return Promise.resolve();
    }

    return timezones.isCurrentlyDoingQuestionnaire(db, message.userId)
        .then(isDoingQuestionnaire => branchDoingQuestionnaire(bot, db, message, isDoingQuestionnaire));
};