'use strict';

const buckets = require('../phil/buckets');
const discord = require('../promises/discord');

function createBucketErrorList(bot, serverLookup, commandName) {
    var message = 'In order to use this command, you must specify the name of a bucket. Within the following servers that we\'re both in, here are the buckets you can submit to:';

    var firstBucket;
    for (let serverId in serverLookup) {
        let server = bot.servers[serverId];
        if (!server) {
            continue;
        }

        let serverBuckets = serverLookup[serverId];
        message += '\n\n**' + server.name + '** (' + serverBuckets.length + ' bucket';
        if (serverBuckets.length !== 1) {
            message += 's';
        }
        message += '):';

        for (let bucket of serverBuckets) {
            if (!firstBucket) {
                firstBucket = bucket;
            }

            message += '\n\t`' + bucket.handle + '` - **' + bucket.displayName + '**';
        }
    }

    message += '\n\nIn order to specify a bucket, the reference handle should be the first thing you type after the command. For example, `' + process.env.COMMAND_PREFIX + commandName + ' ' + firstBucket.handle + '`.';
    return message;
}

function resolveBucket(bot, userBuckets, commandName, commandArgs) {
    if (!userBuckets || userBuckets.length === 0) {
        return Promise.reject('There are no prompt buckets that you are able to submit to. This most likely means that you are not part of any servers with configured prompt buckets. However, if you do know that there are prompt buckets on one (or more) servers, reach out to your admin(s); it could be that you are lacking the appropriate roles, or that prompts are temporarily disabled on that server.');
    }

    if (userBuckets.length === 1) {
        return userBuckets[0];
    }

    if (commandArgs.length === 0) {
        return Promise.reject('You did not specify a prompt bucket to suggest something to (nor did you suggest anything at all!). Please try again, but specify both the bucket you\'d like to submit to as well as the prompt that you would like to submit.');
    }

    const bucketHandle = commandArgs[0];
    const serverLookup = {};
    for (let bucket of userBuckets) {
        if (bucket.handle.toLowerCase() === bucketHandle.toLowerCase()) {
            return bucket;
        }

        if (!serverLookup[bucket.serverId]) {
            serverLookup[bucket.serverId] = [];
        }

        serverLookup[bucket.serverId].push(bucket);
    }

    const errorList = createBucketErrorList(bot, serverLookup, commandName);
    return Promise.reject(errorList);
}

function ensureUserCanSubmitToBucket(bot, db, userId, bucket) {
    if (!bucket.requiredRoleId) {
        return bucket;
    }

    const server = bot.servers[bucket.serverId];
    const member = server.members[userId];
    if (member.roles.includes(bucket.requiredRoleId)) {
        return bucket;
    }

    const role = server.roles[bucket.requiredRoleId];
    return Promise.reject('In order to be able to submit a prompt to this bucket, you must have the **' + role.name + '** role.');
}

function getSuggestionFromCommandArgs(commandArgs, bucket, suggestAnonymously) {
    var unusedArgs = commandArgs;
    if (commandArgs.length > 0 && commandArgs[0].toLowerCase() === bucket.handle.toLowerCase()) {
        unusedArgs = unusedArgs.slice(1);
    }

    const prompt = unusedArgs.join(' ').trim().replace(/`/g, '');
    if (prompt.length === 0) {
        return Promise.reject('You must provide a prompt to suggest!');
    }

    return {
        bucket: bucket,
        prompt: prompt,
        suggestAnonymously: suggestAnonymously
    };
}

function addNewPrompt(db, user, userId, suggestion) {
    var suggestBit = (suggestion.suggestAnonymously ? 1 : 0);
    return db.query(`INSERT INTO
            prompts(suggesting_user, suggesting_userid, date_suggested, prompt_text, submitted_anonymously, bucket_id)
            VALUES($1, $2, CURRENT_TIMESTAMP, $3, $4, $5)`,
            [user, userId, suggestion.prompt, suggestBit, suggestion.bucket.id])
        .then(() => suggestion);
}

function sendConfirmationMessage(bot, channelId, suggestion) {
    return discord.sendEmbedMessage(bot, channelId, {
        color: 0xB0E0E6,
        title: ':envelope_with_arrow: Submission Received',
        description: 'The following prompt has been sent to the admins for approval:\n\n**' + suggestion.prompt + '**\n\nIf it\'s approved, you\'ll see it in chat shortly and you\'ll receive a point for the leaderboard!'
    });
}

module.exports = {
    suggestCommand: function(bot, message, commandArgs, db, commandName, suggestAnonymously) {
        return Promise.resolve()
            .then(() => buckets.getAllForUser(bot, db, message.userId))
            .then(userBuckets => resolveBucket(bot, userBuckets, commandName, commandArgs))
            .then(bucket => ensureUserCanSubmitToBucket(bot, db, message.userId, bucket))
            .then(bucket => getSuggestionFromCommandArgs(commandArgs, bucket, suggestAnonymously))
            .then(suggestion => addNewPrompt(db, message.user, message.userId, suggestion))
            .then(suggestion => sendConfirmationMessage(bot, message.channelId, suggestion));
    }
};
