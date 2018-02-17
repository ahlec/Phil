'use strict';

const features = require('../phil/features');
const helpGroups = require('../phil/help-groups');
const timezones = require('../phil/timezones');

function handleMessage(bot, message, commandArgs, db) {
    return features.ensureFeatureIsEnabled(features.Features.TimezoneProcessing, db)
        .then(() => timezones.startQuestionnaire(bot, db, message.userId, true));
}

module.exports = {
    aliases: [ 'timezones', 'tz' ],

    helpGroup: helpGroups.Groups.Time,
    helpDescription: 'Begins a private message dialogue with Phil to set your timezone, or to change your current timezone.',
    versionAdded: 8,

    publicRequiresAdmin: false,
    processPublicMessage: handleMessage,

    privateRequiresAdmin: false,
    processPrivateMessage: handleMessage
};
