module.exports = (function() {
    'use strict';

    function _parsePromptFromDbRow(dbRow) {
        return {
            promptNumber: dbRow.prompt_number,
            text: dbRow.prompt_text
        };
    }

    function _parseTodaysPromptDbResults(results) {
        if (results.rowCount === 0) {
            return null;
        }

        return _parsePromptFromDbRow(results.rows[0]);
    }

    function _getSetPromptsEnabledDbQuery(enabled) {
        if (enabled === true) {
            return 'DELETE FROM info WHERE key = \'prompt_disabled\'';
        }

        if (enabled === false) {
            return 'INSERT INTO info(key, value) VALUES(\'prompt_disabled\', \'1\')';
        }

        return Promise.reject('Provided a non-boolean value for whether prompts are enabled or not.');
    }

    function _processSetPromptsEnabledDbResults(results) {
        if (results.rowCount === 0) {
            return Promise.reject('Nothing completely broke, but the database wasn\'t actually modified.');
        }
    }

    return {
        getAreDailyPromptsEnabled: function(db) {
            return db.query('SELECT count(*) FROM info WHERE key = \'prompt_disabled\' AND value = \'1\'')
                .then(results => (results.rows[0].count == 0));
        },

        getTodaysPrompt: function(db) {
            const today = new Date();
            return db.query('SELECT prompt_number, prompt_text FROM hijack_prompts WHERE has_been_posted = E\'1\' AND prompt_date = $1', [today])
                .then(_parseTodaysPromptDbResults);
        },

        sendPromptToChannel: function(bot, channelId, prompt) {
            bot.sendMessage({
                to: channelId,
                message: ':snowflake: **HIJACK PROMPT OF THE DAY #' + prompt.promptNumber + '**: ' + prompt.text
            });
        },

        setPromptsEnabled: function(db, enabled) {
            return Promise.resolve()
                .then(() => _getSetPromptsEnabledDbQuery(enabled))
                .then(dbQuery => db.query(dbQuery))
                .then(_processSetPromptsEnabledDbResults);
        }
    };
})();