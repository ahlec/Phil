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
    assertVariableExists('DISCORD_BOT_TOKEN');
    assertVariableExists('PORT');
    assertVariableExists('COMMAND_PREFIX');
    assert.ok(process.env.COMMAND_PREFIX.toLowerCase() === process.env.COMMAND_PREFIX); // Prefix must be lowercase!!
    assertVariableExists('DATABASE_URL');
    assertVariableExists('INTRODUCTIONS_CHANNEL_ID');
    assertVariableExists('ADMIN_CHANNEL_ID');
    assertVariableExists('HIJACK_CHANNEL_ID');
    assertVariableExists('NEWS_CHANNEL_ID');
    assertVariableExists('BOT_CONTROL_CHANNEL_ID');
    assertVariableExists('WELCOME_RULES_CHANNEL_ID');
    assertVariableExists('ADMIN_ROLE_ID');
    assertVariableExists('YOUTUBE_API_KEY');
    assertVariableExists('BOT_MANAGER_USERNAME');
    assertVariableExists('HE_PRONOUNS_ROLE_ID');
    assertVariableExists('SHE_PRONOUNS_ROLE_ID');
    assertVariableExists('THEY_PRONOUNS_ROLE_ID');
    assertVariableExists('HIJACK_FANDOM_GOOGLE_MAP_LINK');
    assertCustomEmoji('CUSTOM_EMOJI_PEEK');
    assertCustomEmoji('CUSTOM_EMOJI_TRANSPARENT');
}
