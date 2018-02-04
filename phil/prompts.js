module.exports = (function() {
    'use strict';

    const botUtils = require('../phil/utils');
    const discord = require('../promises/discord');
    const assert = require('assert');

    const LEADERBOARD_SIZE = 10;

    function _parsePromptDbResult(dbRow, bot, bucket) {
        const server = bot.servers[bucket.serverId];
        const userId = dbRow.suggesting_userid;
        const member = server.members[userId];

        return {
            userId: userId,
            displayName: (member == null ? dbRow.suggesting_user : member.nick),
            isStillInServer: (member != null),
            promptId: dbRow.prompt_id,
            promptNumber: dbRow.prompt_number,
            text: dbRow.prompt_text,
            submittedAnonymously: (parseInt(dbRow.submitted_anonymously) === 1)
        };
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

    function _parsePromptQueueDbResults(results, bot, server) {
        const queue = [];

        for (let index = 0; index < results.rowCount; ++index) {
            queue.push(_parsePromptDbResult(results.rows[index], bot, server));
        }

        return queue;
    }

    function _parseLeaderboardDbResults(results, bot, server) {
        const leaderboard = [];

        for (let index = 0; index < results.rowCount; ++index) {
            let userId = results.rows[index].suggesting_userid;
            const member = server.members[userId];

            leaderboard.push({
                userId: userId,
                displayName: (member == null ? results.rows[index].suggesting_user : member.nick),
                isStillInServer: (member != null),
                score: parseInt(results.rows[index].score)
            });
        }

        return leaderboard;
    }

    function _getPromptMessageFooter(prompt) {
        var footer = 'This was suggested ';

        if (prompt.submittedAnonymously) {
            footer += 'anonymously';
        } else {
            footer += 'by ' + prompt.displayName;
            if (!prompt.isStillInServer) {
                footer += ' (who is no longer in server)';
            }
        }

        footer += '. You can suggest your own by using ' + process.env.COMMAND_PREFIX + 'suggest.';
        return footer;
    }

    function _parseBucketDbResult(dbRow) {
        return {
            id: parseInt(dbRow.bucket_id),
            serverId: dbRow.server_id,
            channelId: dbRow.channel_id,
            handle: dbRow.reference_handle,
            displayName: dbRow.display_name
        };
    }

    return {
        getBucketFromChannelId: function(db, channelId) {
            return db.query('SELECT bucket_id, server_id, channel_id, reference_handle, display_name FROM prompt_buckets WHERE channel_id = $1', [channelId])
                .then(results => {
                    if (results.rowCount === 0) {
                        return null;
                    }

                    assert(results.rowCount === 1);
                    return _parseBucketDbResult(results.rows[0]);
                });
        },

        getTodaysPrompt: function(bot, db, bucket) {
            const today = new Date();
            return db.query(`SELECT prompt_id, suggesting_user, suggesting_userid, prompt_number, prompt_text, submitted_anonymously
                    FROM prompts
                    WHERE bucket_id = $1 AND has_been_posted = E\'1\' AND prompt_date = $2`, [bucket.id, today])
                .then(results => {
                    if (results.rowCount === 0) {
                        return null;
                    }

                    return _parsePromptDbResult(results.rows[0], bot, bucket);
                });
        },

        sendPromptToChannel: function(bot, channelId, promptNumber, prompt) {
            var footer = _getPromptMessageFooter(prompt);

            return discord.sendEmbedMessage(bot, channelId, {
                color: 0xB0E0E6,
                title: ':snowflake: Hijack Prompt of the Day #' + promptNumber + ' :dragon_face:',
                description: prompt.text,
                footer: {
                    text: footer
                }
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

        getPromptQueue: function(db, bot, server, maxNumResults) {
            return db.query('SELECT prompt_id, suggesting_user, suggesting_userid, prompt_number, prompt_text, submitted_anonymously FROM prompts WHERE has_been_posted=E\'0\' AND approved_by_admin=E\'1\' ORDER BY date_suggested ASC LIMIT $1', [maxNumResults])
                .then(results => _parsePromptQueueDbResults(results, bot, server));
        },

        getPromptQueueLength: function(db) {
            return db.query('SELECT count(*) FROM prompts WHERE has_been_posted = E\'0\' AND approved_by_admin = E\'1\'')
                .then(results => parseInt(results.rows[0].count));
        },

        getLeaderboard: function(bot, db, server) {
            return db.query(`SELECT suggesting_userid, suggesting_user, count(prompt_id) as "score"
                    FROM prompts p
                    JOIN prompt_buckets pb
                        ON p.bucket_id = pb.bucket_id
                    WHERE approved_by_admin = E\'1\' AND pb.server_id = $1
                    GROUP BY suggesting_userid, suggesting_user
                    ORDER BY score DESC
                    LIMIT $2`, [server.id, LEADERBOARD_SIZE] )
                .then(results => _parseLeaderboardDbResults(results, bot, server));
        }
    };
})();
