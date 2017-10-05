'use strict';
const CURRENT_DATABASE_VERSION = 3;
const CURRENT_PHIL_VERSION = 5;

// Make sure our environment is ready to operate
const assert = require('assert');
assert.ok(process.env.DISCORD_BOT_TOKEN !== undefined);
assert.ok(process.env.PORT !== undefined);
assert.ok(process.env.COMMAND_PREFIX !== undefined);
assert.ok(process.env.COMMAND_PREFIX.toLowerCase() === process.env.COMMAND_PREFIX); // Prefix must be lowercase!!
assert.ok(process.env.DATABASE_URL !== undefined);
assert.ok(process.env.ADMIN_CHANNEL_ID !== undefined);
assert.ok(process.env.HIJACK_CHANNEL_ID !== undefined);
assert.ok(process.env.NEWS_CHANNEL_ID !== undefined);
assert.ok(process.env.ADMIN_ROLE_ID !== undefined);
assert.ok(process.env.YOUTUBE_API_KEY !== undefined);
assert.ok(process.env.BOT_MANAGER_USERNAME !== undefined);
assert.ok(process.env.HE_PRONOUNS_ROLE_ID !== undefined);
assert.ok(process.env.SHE_PRONOUNS_ROLE_ID !== undefined);
assert.ok(process.env.THEY_PRONOUNS_ROLE_ID !== undefined);

// Retrieve the modules
const discord = require('discord.io');
const express = require('express');
const db = require('./database.js')(process.env.DATABASE_URL);
const botCommands = require('./commands');
const botUtils = require('./bot_utils.js');
const chronos = require('./chronos');
const CommandRunner = require('./phil/command-runner');

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
bot.PHIL_VERSION = CURRENT_PHIL_VERSION;
bot.DATABASE_VERSION = CURRENT_DATABASE_VERSION;
const commandRunner = new CommandRunner(bot, botCommands, chronos, db);

bot.on('ready', function() {
    console.log('Logged in as %s - %s\n', bot.username, bot.id);

    chronos.start(bot, db);
});

bot.on('message', function(user, userId, channelId, message, event) {
	commandRunner.runMessage(user, userId, channelId, message);
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

// Ping the server every 12 minutes so that the Heroku dynos won't fall asleep
setInterval(() => {
    botUtils.getUrl(process.env.PUBLIC_APP_URL);
}, 1000 * 60 * 12);