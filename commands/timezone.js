module.exports = (function() {
    'use strict';

    const helpGroups = require('../phil/help-groups');
    const timezones = require('../phil/timezones');

    function handleMessage(bot, message, commandArgs, db) {
        return timezones.startQuestionnaire(bot, db, message.userId, true);
    }

    return {
        aliases: [ 'timezones', 'tz' ],

        helpGroup: helpGroups.Groups.General,
        helpDescription: 'Begins a private message dialogue with Phil to set your timezone, or to change your current timezone.',
        versionAdded: 8,

        publicRequiresAdmin: false,
        processPublicMessage: handleMessage,

        privateRequiresAdmin: false,
        processPrivateMessage: handleMessage
    };
})();