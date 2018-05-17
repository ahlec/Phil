'use strict';

const assert = require('assert');

function assertVariableExists(variableName : string) {
    const envVariable = process.env[variableName];
    assert.ok(envVariable, 'The environment variable `' + variableName + '` does not exist.');
}

function assertCustomEmoji(variableName : string) {
    assertVariableExists(variableName);

    const envVariable = process.env[variableName];
    assert.ok(/<:[a-zA-Z0-9_]{2,}:[0-9]{10,}>/.test(envVariable), 'The environment variable `' + variableName + '` is not in the proper custom emoji format. Type \\ before the custom emoji and copy in everything, including the < and >');
}

export function ensureNecessaryEnvironmentVariables() {
    assertCustomEmoji('CUSTOM_EMOJI_PEEK');
    assertCustomEmoji('CUSTOM_EMOJI_TRANSPARENT');
}
