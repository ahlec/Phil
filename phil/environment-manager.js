'use strict';

const assert = require('assert');

function _assertVariableExists(variableName) {
    const envVariable = process.env[variableName];
    assert.ok(envVariable, 'The environment variable `' + variableName + '` does not exist.');
}

function _assertCustomEmoji(variableName) {
	_assertVariableExists(variableName);

    const envVariable = process.env[variableName];
    assert.ok(/<:[a-zA-Z0-9_]{2,}:[0-9]{10,}>/.test(envVariable), 'The environment variable `' + variableName + '` is not in the proper custom emoji format. Type \\ before the custom emoji and copy in everything, including the < and >');
}

function _assertEnvironmentVariables() {
    _assertVariableExists('DISCORD_BOT_TOKEN');
    _assertVariableExists('PORT');
    _assertVariableExists('COMMAND_PREFIX');
    assert.ok(process.env.COMMAND_PREFIX.toLowerCase() === process.env.COMMAND_PREFIX); // Prefix must be lowercase!!
    _assertVariableExists('DATABASE_URL');
    _assertVariableExists('INTRODUCTIONS_CHANNEL_ID');
    _assertVariableExists('ADMIN_CHANNEL_ID');
    _assertVariableExists('HIJACK_CHANNEL_ID');
    _assertVariableExists('NEWS_CHANNEL_ID');
    _assertVariableExists('BOT_CONTROL_CHANNEL_ID');
    _assertVariableExists('WELCOME_RULES_CHANNEL_ID');
    _assertVariableExists('ADMIN_ROLE_ID');
    _assertVariableExists('YOUTUBE_API_KEY');
    _assertVariableExists('BOT_MANAGER_USERNAME');
    _assertVariableExists('HE_PRONOUNS_ROLE_ID');
    _assertVariableExists('SHE_PRONOUNS_ROLE_ID');
    _assertVariableExists('THEY_PRONOUNS_ROLE_ID');
    _assertVariableExists('HIJACK_FANDOM_GOOGLE_MAP_LINK');
    _assertCustomEmoji('CUSTOM_EMOJI_PEEK');
    _assertCustomEmoji('CUSTOM_EMOJI_TRANSPARENT');
}

function _ensureNecessaryEnvironmentVariables(resolve, reject) {
    try {
        _assertEnvironmentVariables();
        resolve();
    } catch (assertException) {
        reject(assertException);
    }
}

module.exports = class EnvironmentManager {
    static assertVariablesValid() {
        return new Promise(_ensureNecessaryEnvironmentVariables);
    }
};
