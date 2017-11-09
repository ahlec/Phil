module.exports = (function() {
    'use strict';

    const botUtils = require('../bot_utils');
    const features = require('../phil/features');
    const helpGroups = require('../phil/help-groups');

    function _ensureFeatureIsDisabled(isEnabled) {
        if (isEnabled !== false) {
            return Promise.reject('This feature is not currently disabled, so attempting to enable it would do nothing.');
        }
    }

    function _sendSuccessMessage(bot, channelId, featureDisplayName) {
        botUtils.sendSuccessMessage({
            bot: bot,
            channelId: channelId,
            message: featureDisplayName + ' are no longer disabled. You can disable this feature again by using `' + process.env.COMMAND_PREFIX + 'disable`.'
        });
    }

    function _processFeatureNumber(featureNumber, db, bot, channelId) {
        if (featureNumber === null) {
            return;
        }

        return features.getIsFeatureEnabled(featureNumber, db)
            .then(_ensureFeatureIsDisabled)
            .then(() => features.setIsFeatureEnabled(featureNumber, db, true))
            .then(() => features.getFeatureDisplayName(featureNumber))
            .then(displayName => _sendSuccessMessage(bot, channelId, displayName));
    }

    return {
        aliases: [],

        helpGroup: helpGroups.Groups.Admin,
        helpDescription: 'Enables a feature of Phil\'s.',
        versionAdded: 9,

        publicRequiresAdmin: true,
        processPublicMessage: function(bot, message, commandArgs, db) {
            return features.getFeatureNumberFromCommandArgs(commandArgs)
                .then(featureNumber => _processFeatureNumber(featureNumber, db, bot, message.channelId));
        }
    };
})();
