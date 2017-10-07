'use strict';

// Retrieve the modules
const express = require('express');
const EnvironmentManager = require('./phil/environment-manager');
const Database = require('./phil/database.js');
const Phil = require('./phil/phil');

const botUtils = require('./bot_utils.js');

// [ run ]
function handleStartupError(err) {
    console.error(err);
    process.exit(1);
}

EnvironmentManager.assertVariablesValid()
    .then(() => new Database())
    .then(db => db.checkIsCurrentVersion())
    .then(db => new Phil(db))
    .then(phil => phil.start())
    .catch(handleStartupError);

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