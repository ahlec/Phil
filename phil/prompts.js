module.exports = (function() {
    'use strict';

    const botUtils = require('../phil/utils');
    const discord = require('../promises/discord');
    const assert = require('assert');

    function _parsePromptFromDbRow(dbRow) {
        return {
            promptNumber: dbRow.prompt_number,
            text: dbRow.prompt_text
        };
    }

    function _parseTodaysPromptDbResults(results) {
        if (results.rowCount === 0) {
            return null;
        }

        return _parsePromptFromDbRow(results.rows[0]);
    }

    function _getSingleCommandArg(commandArgs) {
        if (commandArgs.length !== 1) {
            return Promise.reject('You must provide a single parameter. This can be either an individual number, or a range of numbers.');
        }

        return commandArgs[0];
    }

    function _parseSingleConfirmRejectArg(commandArg) {
        return Promise.resolve([parseInt(commandArg)]);
    }

    function _parseRangeConfirmRejectArg(commandArg) {
        const separatedPieces = commandArg.split('-');
        if (separatedPieces.length !== 2) {
            return Promise.reject('You must use the format of `1-9` or `3-5` to indicate a range of numbers.');
        }

        if (!botUtils.isNumeric(separatedPieces[0]) || !botUtils.isNumeric(separatedPieces[1])) {
            return Promise.reject('One or both of the arguments you provided in the range were not actually numbers.');
        }

        const lowerBound = parseInt(separatedPieces[0]);
        const upperBound = parseInt(separatedPieces[1]);
        if (upperBound < lowerBound) {
            return Promise.reject('The range you indicated was a negative range (the second number came before the first number)!');
        }

        var includedNumbers = [];
        for (let num = lowerBound; num <= upperBound; ++num) {
            includedNumbers.push(num);
        }

        return includedNumbers;
    }

    function _parseConfirmRejectCommandArg(commandArg) {
        if (botUtils.isNumeric(commandArg)) {
            return _parseSingleConfirmRejectArg(commandArg);
        }

        return _parseRangeConfirmRejectArg(commandArg);
    }

    function _ensureAtLeastOneConfirmRejectNumber(numbers) {
        if (numbers.length === 0) {
            return Promise.reject('You must specify at least one number as an argument in order to use this command.');
        }

        return numbers;
    }

    function _processConfirmationQueueRemoval(results, numSuccessful) {
        if (results.rowCount === 0) {
            return Promise.reject('Could not remove a prompt from the unconfirmed confirmation queue.');
        }

        return numSuccessful + 1;
    }

    function _processConfirmRejectActionFuncResults(results, db, channelId, number, numSuccessful) {
        if (results.rowCount === 0) {
            return Promise.reject('There was a problem performing the SQL action for this command.');
        }

        return db.query('DELETE FROM prompt_confirmation_queue WHERE channel_id = $1 AND confirm_number = $2', [channelId, number])
            .then(removalResults => _processConfirmationQueueRemoval(removalResults, numSuccessful));
    }

    function _confirmRejectPerformDbAction(results, db, channelId, number, dbActionFunc, numSuccessful) {
        if (results.rowCount === 0) {
            return numRejected;
        }

        const promptId = results.rows[0].prompt_id;
        const actionFuncReturn = dbActionFunc(db, promptId);
        assert(botUtils.isPromise(actionFuncReturn));
        return actionFuncReturn
                .then(funcResults => _processConfirmRejectActionFuncResults(funcResults, db, channelId, number, numSuccessful));
    }

    function _confirmRejectNumber(db, channelId, number, dbActionFunc, numSuccessful) {
        number = number - 1; // Public facing, it's 1-based, but in the database it's 0-based
        return db.query('SELECT prompt_id FROM prompt_confirmation_queue WHERE channel_id = $1 and confirm_number = $2', [channelId, number])
            .then(results => _confirmRejectPerformDbAction(results, db, channelId, number, dbActionFunc, numSuccessful));
    }

    function _parsePromptQueueDbResults(results) {
        const queue = [];

        for (let index = 0; index < results.rowCount; ++index) {
            queue.push({
                promptId: results.rows[index].prompt_id,
                promptText: results.rows[index].prompt_text
            });
        }

        return queue;
    }

    return {
        getTodaysPrompt: function(db) {
            const today = new Date();
            return db.query('SELECT prompt_number, prompt_text FROM hijack_prompts WHERE has_been_posted = E\'1\' AND prompt_date = $1', [today])
                .then(_parseTodaysPromptDbResults);
        },

        sendPromptToChannel: function(bot, channelId, promptNumber, promptText) {
            return discord.sendEmbedMessage(bot, channelId, {
                color: 0xB0E0E6,
                title: ':snowflake: Hijack Prompt of the Day #' + promptNumber + ' :dragon_face:',
                description: promptText
            });
        },

        getConfirmRejectNumbersFromCommandArgs: function(commandArgs) { // Resolves: array of integers
            return Promise.resolve()
                .then(() => _getSingleCommandArg(commandArgs))
                .then(commandArg => _parseConfirmRejectCommandArg(commandArg))
                .then(numbers => _ensureAtLeastOneConfirmRejectNumber(numbers));
        },

        confirmRejectNumbers: function(db, channelId, numbers, dbActionFunc) { // Resolves: the number of successfully confirmed/rejected prompts
            var promise = Promise.resolve(0);
            for (let index = 0; index < numbers.length; ++index) {
                promise = promise.then(numSuccessful => _confirmRejectNumber(db, channelId, numbers[index], dbActionFunc, numSuccessful));
            }

            return promise;
        },

        getPromptQueue: function(db, maxNumResults) {
            return db.query('SELECT prompt_id, prompt_text FROM hijack_prompts WHERE has_been_posted=E\'0\' AND approved_by_user=E\'1\' AND approved_by_admin=E\'1\' ORDER BY date_suggested ASC LIMIT $1', [maxNumResults])
                .then(_parsePromptQueueDbResults);
        },

        getPromptQueueLength: function(db) {
            return db.query('SELECT count(*) FROM hijack_prompts WHERE has_been_posted = E\'0\' AND approved_by_user = E\'1\' AND approved_by_admin = E\'1\'')
                .then(results => parseInt(results.rows[0].count));
        },
    };
})();
