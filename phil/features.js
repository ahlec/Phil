'use strict';

const botUtils = require('../phil/utils');

const FEATURES = [
    {
        displayName: 'Daily Prompts',
        names: ['prompt', 'prompts', 'daily prompts', 'daily', 'daily prompt'],
        enabledDbInfoKey: 'prompt_disabled'
    },
    {
        displayName: 'Timezone Processing',
        names: ['timezone', 'timezones', 'tz', 'timezone processing', 'timezones processing'],
        enabledDbInfoKey: 'timezone-processing-enabled'
    },
];

function _getInvalidFeatureNameInputMessage() {
    var message = 'This function requires a valid name of a feature. Currently, the valid feature names are:\n';

    for (let feature of FEATURES) {
        message += feature.displayName + ': ' + botUtils.stitchTogetherArray(feature.names) + '\n';
    }

    return message.trim();
}

function _getFeatureNumberByName(name) { // Resolves to feature number if found, null otherwise.
    if (!name || name.length === 0) {
        return Promise.reject(_getInvalidFeatureNameInputMessage());
    }
    name = name.toLowerCase();

    for (let index = 0; index < FEATURES.length; ++index) {
        const feature = FEATURES[index];
        if (feature.names.indexOf(name) >= 0) {
            return Promise.resolve(index);
        }
    }

    return Promise.reject(_getInvalidFeatureNameInputMessage());
}

function _getFeatureByNumber(featureNumber) {
    const feature = FEATURES[featureNumber];
    if (!feature) {
        return Promise.reject('Unknown feature (featureNumber of ' + featureNumber + ')');
    }

    return Promise.resolve(feature);
}

function _setFeatureEnabledDb(feature, db, enabled) {
    if (enabled === true) {
        return db.query('DELETE FROM info WHERE key = $1', [feature.enabledDbInfoKey]);
    }

    if (enabled === false) {
        return db.query('INSERT INTO info(key, value) VALUES($1, \'1\')', [feature.enabledDbInfoKey]);
    }

    return Promise.reject('Provided a non-boolean value for whether timezone processing is enabled or not.');
}

function _ensureDbWasModified(results) {
    if (results.rowCount === 0) {
        return Promise.reject('There was no change in the database when performing this action.');
    }
}

module.exports = {
    Features: {
        DailyPrompts: 0,
        TimezoneProcessing: 1,
    },

    getFeatureNumberFromCommandArgs: function(commandArgs) {
        if (!commandArgs || commandArgs.length === 0) {
            return Promise.reject(_getInvalidFeatureNameInputMessage());
        }

        const stitchedInput = commandArgs.join(' ').trim();
        return _getFeatureNumberByName(stitchedInput);
    },

    getFeatureDisplayName: function(featureNumber) {
        return _getFeatureByNumber(featureNumber)
            .then(feature => feature.displayName);
    },

    getIsFeatureEnabled: function(featureNumber, db) {
        return _getFeatureByNumber(featureNumber)
            .then(feature => db.query('SELECT count(*) FROM info WHERE key = $1 AND value =\'1\'', [feature.enabledDbInfoKey]))
            .then(results => (results.rows[0].count == 0));
    },

    setIsFeatureEnabled: function(featureNumber, db, enabled) {
        return _getFeatureByNumber(featureNumber)
            .then(feature => _setFeatureEnabledDb(feature, db, enabled))
            .then(_ensureDbWasModified);
    }
};
