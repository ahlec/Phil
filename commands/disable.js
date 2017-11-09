module.exports = (function() {
    'use strict';

    const botUtils = require('../bot_utils');
    const features = require('../phil/features');
    const helpGroups = require('../phil/help-groups');

    function _ensureFeatureIsEnabled(isEnabled) {
        if (isEnabled !== true) {
            return Promise.reject('This feature is already disabled.');
        }
    }

    function _sendSuccessMessage(bot, channelId, featureDisplayName) {
        botUtils.sendSuccessMessage({
            bot: bot,
            channelId: channelId,
            message: featureDisplayName + ' are now disabled. You can enable this feature again by using `' + process.env.COMMAND_PREFIX + 'enable`.'
        });
    }

    function _processFeatureNumber(featureNumber, db, bot, channelId) {
        if (featureNumber === null) {
            return;
        }

        return features.getIsFeatureEnabled(featureNumber, db)
            .then(_ensureFeatureIsEnabled)
            .then(() => features.setIsFeatureEnabled(featureNumber, db, false))
            .then(() => features.getFeatureDisplayName(featureNumber))
            .then(displayName => _sendSuccessMessage(bot, channelId, displayName));
    }

    return {
        aliases: [],

        helpGroup: helpGroups.Groups.Admin,
        helpDescription: 'Disables a feature of Phil\'s.',
        versionAdded: 9,

        publicRequiresAdmin: true,
        processPublicMessage: function(bot, message, commandArgs, db) {
            return features.getFeatureNumberFromCommandArgs(commandArgs)
                .then(featureNumber => _processFeatureNumber(featureNumber, db, bot, message.channelId));
        }
    };
})();
