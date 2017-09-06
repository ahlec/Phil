module.exports = (function() {
    const assert = require('assert');

    function validateInputParameters(bot, command, userId, channelId, isDirectMessage) {
        assert(typeof(bot) === 'object');
        assert(typeof(command) === 'object');
        assert(typeof(userId) === 'string');
        assert(typeof(channelId) === 'string');
        assert(typeof(isDirectMessage) === 'boolean');
    }

    return {
        recordState: function(bot, command, userId, channelId, isDirectMessage, state) {
            validateInputParameters(bot, command, userId, channelId, isDirectMessage);

            // TODO
        },

        retrieveState: function(bot, command, userId, channelId, isDirectMessage) {
            validateInputParameters(bot, command, userId, channelId, isDirectMessage);

            // TODO
        }
    }
})();