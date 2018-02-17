'use strict';

const botUtils = require('../phil/utils');
const discord = require('../promises/discord');
const assert = require('assert');
const buckets = require('../phil/buckets');

const LEADERBOARD_SIZE = 10;

function _parsePromptDbResult(dbRow, bot, bucket) {
    const server = bot.servers[bucket.serverId];
    const userId = dbRow.suggesting_userid;
    const member = server.members[userId];
    const currentUserDisplayName = botUtils.getUserDisplayName(bot, bucket.serverId, userId);

    return {
        userId: userId,
        displayName: (currentUserDisplayName || dbRow.suggesting_user),
        isStillInServer: (member != null),
        promptId: dbRow.prompt_id,
        datePosted: (dbRow.prompt_date ? new Date(dbRow.prompt_date) : null),
        promptNumber: dbRow.prompt_number,
        text: dbRow.prompt_text,
        submittedAnonymously: (parseInt(dbRow.submitted_anonymously) === 1),
        bucketId: parseInt(dbRow.bucket_id)
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

function _processConfirmRejectActionFuncResults(db, channelId, number, numSuccessful) {
    return db.query('DELETE FROM prompt_confirmation_queue WHERE channel_id = $1 AND confirm_number = $2', [channelId, number])
        .then(removalResults => _processConfirmationQueueRemoval(removalResults, numSuccessful));
}

function _confirmRejectPerformDbAction(results, bot, db, channelId, number, dbActionFunc, numSuccessful) {
    if (results.rowCount === 0) {
        return numSuccessful;
    }

    const promptId = results.rows[0].prompt_id;
    const actionFuncReturn = dbActionFunc(bot, db, promptId);
    assert(botUtils.isPromise(actionFuncReturn));
    return actionFuncReturn.then(() => _processConfirmRejectActionFuncResults(db, channelId, number, numSuccessful));
}

function _confirmRejectNumber(bot, db, channelId, number, dbActionFunc, numSuccessful) {
    number = number - 1; // Public facing, it's 1-based, but in the database it's 0-based
    return db.query('SELECT prompt_id FROM prompt_confirmation_queue WHERE channel_id = $1 and confirm_number = $2', [channelId, number])
        .then(results => _confirmRejectPerformDbAction(results, bot, db, channelId, number, dbActionFunc, numSuccessful));
}

function _parseLeaderboardDbResults(results, bot, server) {
    const leaderboard = [];

    for (let index = 0; index < results.rowCount; ++index) {
        let userId = results.rows[index].suggesting_userid;
        const member = server.members[userId];
        const currentUserDisplayName = botUtils.getUserDisplayName(bot, server.id, userId);

        leaderboard.push({
            userId: userId,
            displayName: (currentUserDisplayName || results.rows[index].suggesting_user),
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

function _sendPromptToChannel(bot, channelId, bucket, promptNumber, prompt) {
    var footer = _getPromptMessageFooter(prompt);

    return discord.sendEmbedMessage(bot, channelId, {
        color: 0xB0E0E6,
        title: bucket.promptTitleFormat.replace(/\{0\}/g, promptNumber),
        description: prompt.text,
        footer: {
            text: footer
        }
    });
}

function _handleHasBeenPostedResults(results) {
    if (results.rowCount === 0) {
        return Promise.reject('We found a prompt in the queue, but we couldn\'t update it to mark it as being posted.');
    }
}

function _postNewPromptToChannel(bot, bucket, promptNumber, prompt) {
    return _sendPromptToChannel(bot, bucket.channelId, bucket, promptNumber, prompt)
        .then(messageId => {
            if (!bucket.shouldPinPosts) {
                return;
            }

            return discord.pinMessage(bot, bucket.channelId, messageId);
        });
}

module.exports = {
    getFromId: function(bot, db, promptId) {
        return db.query(`SELECT prompt_id, suggesting_user, suggesting_userid, prompt_number, prompt_date, prompt_text, submitted_anonymously, bucket_id
                FROM prompts
                WHERE prompt_id = $1`, [promptId])
            .then(results => {
                if (results.rowCount === 0) {
                    return null;
                }

                return buckets.getFromId(bot, db, results.rows[0].bucket_id)
                    .then(bucket => _parsePromptDbResult(results.rows[0], bot, bucket));
            });
    },

    getCurrentPrompt: function(bot, db, bucket) {
        return db.query(`SELECT prompt_id, suggesting_user, suggesting_userid, prompt_number, prompt_date, prompt_text, submitted_anonymously, bucket_id
                FROM prompts
                WHERE bucket_id = $1 AND has_been_posted = E'1'
                ORDER BY prompt_date DESC
                LIMIT 1`, [bucket.id])
            .then(results => {
                if (results.rowCount === 0) {
                    return null;
                }

                return _parsePromptDbResult(results.rows[0], bot, bucket);
            });
    },

    sendPromptToChannel: _sendPromptToChannel,

    getConfirmRejectNumbersFromCommandArgs: function(commandArgs) { // Resolves: array of integers
        return Promise.resolve()
            .then(() => _getSingleCommandArg(commandArgs))
            .then(commandArg => _parseConfirmRejectCommandArg(commandArg))
            .then(numbers => _ensureAtLeastOneConfirmRejectNumber(numbers));
    },

    confirmRejectNumbers: function(bot, db, channelId, numbers, dbActionFunc) { // Resolves: the number of successfully confirmed/rejected prompts
        var promise = Promise.resolve(0);
        for (let index = 0; index < numbers.length; ++index) {
            promise = promise.then(numSuccessful => _confirmRejectNumber(bot, db, channelId, numbers[index], dbActionFunc, numSuccessful));
        }

        return promise;
    },

    getPromptQueue: function(db, bot, bucket, maxNumResults) {
        return db.query(`SELECT prompt_id, suggesting_user, suggesting_userid, prompt_number, prompt_date, prompt_text, submitted_anonymously, bucket_id
                FROM prompts
                WHERE has_been_posted =E'0' AND approved_by_admin = E'1' AND bucket_id = $1 ORDER BY date_suggested ASC LIMIT $2`, [bucket.id, maxNumResults])
            .then(results => {
                const queue = [];

                for (let index = 0; index < results.rowCount; ++index) {
                    queue.push(_parsePromptDbResult(results.rows[index], bot, bucket));
                }

                return queue;
            });
    },

    getPromptQueueLength: function(db, bucket) {
        return db.query('SELECT count(*) FROM prompts WHERE bucket_id = $1 AND has_been_posted = E\'0\' AND approved_by_admin = E\'1\'', [bucket.id])
            .then(results => parseInt(results.rows[0].count));
    },

    getUnconfirmedPrompts: function(bot, db, bucket, maxNumResults) {
        return db.query('SELECT prompt_id, suggesting_user, suggesting_userid, -1 as "prompt_number", NULL as prompt_date, prompt_text, submitted_anonymously, bucket_id FROM prompts WHERE bucket_id = $1 AND approved_by_admin = E\'0\' ORDER BY date_suggested ASC LIMIT $2', [bucket.id, maxNumResults])
            .then(results => {
                var list = [];

                for (let index = 0; index < results.rowCount; ++index) {
                    list.push(_parsePromptDbResult(results.rows[index], bot, bucket));
                }

                return list;
            });
    },

    getLeaderboard: function(bot, db, server) {
        return db.query(`SELECT suggesting_userid, suggesting_user, count(prompt_id) as "score"
                FROM prompts p
                JOIN prompt_buckets pb
                    ON p.bucket_id = pb.bucket_id
                WHERE approved_by_admin = E'1' AND pb.server_id = $1
                GROUP BY suggesting_userid, suggesting_user
                ORDER BY score DESC
                LIMIT $2`, [server.id, LEADERBOARD_SIZE])
            .then(results => _parseLeaderboardDbResults(results, bot, server));
    },

    countUnconfirmedPromptsForServer: function(db, serverId) {
        return db.query(`SELECT pb.bucket_id, reference_handle, display_name, count(*) as "total"
                FROM prompts p
                JOIN prompt_buckets pb
                    ON p.bucket_id = pb.bucket_id
                WHERE pb.server_id = $1 AND approved_by_admin = E'0'
                GROUP BY pb.bucket_id, pb.reference_handle, pb.display_name`, [serverId])
            .then(results => {
                var counts = [];

                for (let dbRow of results.rows) {
                    counts.push({
                        bucketId: dbRow.bucket_id,
                        handle: dbRow.reference_handle,
                        displayName: dbRow.display_name,
                        numUnconfirmed: parseInt(dbRow.total)
                    });
                }

                return counts;
            });
    },

    postNewPrompt: function(bot, db, prompt, now) {
        return buckets.getFromId(bot, db, prompt.bucketId)
            .then(bucket => {
                return db.query('SELECT prompt_number FROM prompts WHERE has_been_posted = E\'1\' AND bucket_id = $1 ORDER BY prompt_number DESC LIMIT 1', [bucket.id])
                    .then(results => (results.rowCount > 0 ? results.rows[0].prompt_number + 1 : 1))
                    .then(promptNumber => {
                        return db.query('UPDATE prompts SET has_been_posted = E\'1\', prompt_number = $1, prompt_date = $2 WHERE prompt_id = $3', [promptNumber, now, prompt.promptId])
                            .then(_handleHasBeenPostedResults)
                            .then(() => _postNewPromptToChannel(bot, bucket, promptNumber, prompt));
                    });
            });
    }
};
