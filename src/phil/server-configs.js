'use strict';

const assert = require('assert');

function parseServerConfigDbResult(dbRow, bot) {
    return {
        serverId: dbRow.server_id,
        botControlChannelId: dbRow.bot_control_channel_id
    };
}

module.exports = {
    getFromId: function(bot, db, serverId) {
        return db.query('SELECT * FROM server_configs WHERE server_id = $1', [serverId])
            .then(results => {
                if (results.rowCount === 0) {
                    return null;
                }

                assert(results.rowCount === 1);
                return parseServerConfigDbResult(results.rows[0], bot);
            });
    }
};
