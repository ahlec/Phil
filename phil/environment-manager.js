'use strict';

const assert = require('assert');

function _assertEnvironmentVariables() {
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