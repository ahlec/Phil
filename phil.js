'use strict';
const CURRENT_DATABASE_VERSION = 2;

// Make sure our environment is ready to operate
const assert = require('assert');
assert.ok(process.env.DISCORD_BOT_TOKEN !== undefined);
assert.ok(process.env.PORT !== undefined);
assert.ok(process.env.COMMAND_PREFIX !== undefined);
assert.ok(process.env.COMMAND_PREFIX.toLowerCase() === process.env.COMMAND_PREFIX); // Prefix must be lowercase!!
assert.ok(process.env.DATABASE_URL !== undefined);
assert.ok(process.env.ADMIN_CHANNEL_ID !== undefined);
assert.ok(process.env.HIJACK_CHANNEL_ID !== undefined);
assert.ok(process.env.ADMIN_ROLE_ID !== undefined);

// Retrieve the modules
const discord = require('discord.io');
const express = require('express');
const db = require('./database.js')(process.env.DATABASE_URL);
const botCommands = require('./commands');
const botUtils = require('./bot_utils.js');
const chronos = require('./chronos');

// Make sure that we have the correct database version
db.query("SELECT value FROM info WHERE key = 'database-version'")
    .then(result => {
        if (result.rows[0].value != CURRENT_DATABASE_VERSION) {
            console.error('The required database version is %s but the current database is version %s', CURRENT_DATABASE_VERSION, result.rows[0].value);
            process.exit(1);
        }
    })
    .catch(err => {
        console.error('Encountered a database error when attempting to figure out the current database version. ' + err);
        process.exit(1);
    });

// Connect to the bot
const bot = new discord.Client( { token: process.env.DISCORD_BOT_TOKEN, autorun: true } );

bot.on('ready', function() {
    console.log('Logged in as %s - %s\n', bot.username, bot.id);

    chronos.start(bot, db);
});

bot.on('message', function(user, userId, channelId, message, event) {
    if (message === undefined || message === "") {
        return;
    }

    chronos.recordNewMessageInChannel(channelId);

    // Process the incoming data
    const isDirectMessage = ( channelId in bot.directMessages ? true : false );
    const messageTokens = message.split(' ');
    const words = message.split(' ');
    const isPrompt = (words.length > 0 && words[0].toLowerCase().startsWith(process.env.COMMAND_PREFIX));
    const command = (isPrompt ? words[0].substr(process.env.COMMAND_PREFIX.length) : undefined);

    // Handle the message
    if (!isPrompt) {
        return;
    }
    
    console.log('user \'%s\' (%s) used command \'%s\'', user, userId, command);
    if (botCommands[command] === undefined) {
        botUtils.sendErrorMessage({
            bot: bot,
            channelId: channelId,
            message: 'There is no `' + process.env.COMMAND_PREFIX + command + '` command.'
        });
        return;
    }

    var requiresAdmin;
    var commandFunction;
    var incorrectChannelErrorMessage;
    if (isDirectMessage) {
        requiresAdmin = botCommands[command].privateRequiresAdmin;
        commandFunction = botCommands[command].processPrivateMessage;
        incorrectChannelErrorMessage = 'The `' + process.env.COMMAND_PREFIX + command + '` command can only be used in the public server itself.';
    } else {
        requiresAdmin = botCommands[command].publicRequiresAdmin;
        commandFunction = botCommands[command].processPublicMessage;
        incorrectChannelErrorMessage = 'The `' + process.env.COMMAND_PREFIX + command + '` command can only be used in a direct message with me.';
    }

    if (requiresAdmin) {
        const serverId = bot.channels[channelId].guild_id;
        const server = bot.servers[serverId];
        const member = server.members[userId];
        var isUserAnAdmin = botUtils.isMemberAnAdminOnServer(member, server);
        if (!isUserAnAdmin) {
            botUtils.sendErrorMessage({
                bot: bot,
                channelId: channelId,
                message: 'The command `' + process.env.COMMAND_PREFIX + command + '` requires admin privileges to use.'
            });
            return;
        }
    }

    if (commandFunction) {
        commandFunction(bot, user, userId, channelId, words.slice(1), db);
    } else {
        botUtils.sendErrorMessage({
            bot: bot,
            channelId: channelId,
            message: incorrectChannelErrorMessage
        });
    }
});

// Set up the web portal
const app = express();
app.set('view engine', 'ejs');
app.use(express.static(__dirname + '/assets'));

// Run web portal
app.get('/', (request, response) => {
    response.render('index');
});

app.listen(process.env.PORT, () => {
    console.log('Web portal is running on port ' + process.env.PORT);
});

// Ping the server every 15 minutes so that the Heroku dynos won't fall asleepe
setInterval(() => {
    botUtils.getUrl(process.env.PUBLIC_APP_URL);
}, 1000 * 60 * 15);