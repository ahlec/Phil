'use strict';

const assert = require('assert');

function parseBucketDbResult(dbRow) {
    return {
        id: parseInt(dbRow.bucket_id),
        serverId: dbRow.server_id,
        channelId: dbRow.channel_id,
        handle: dbRow.reference_handle,
        displayName: dbRow.display_name
    };
}

module.exports = {
    getFromChannelId: function(db, channelId) {
        return db.query('SELECT bucket_id, server_id, channel_id, reference_handle, display_name FROM prompt_buckets WHERE channel_id = $1', [channelId])
            .then(results => {
                if (results.rowCount === 0) {
                    return null;
                }

                assert(results.rowCount === 1);
                return parseBucketDbResult(results.rows[0]);
            });
    },

    getFromReferenceHandle: function(db, referenceHandle) {
        return db.query('SELECT bucket_id, server_id, channel_id, reference_handle, display_name FROM prompt_buckets WHERE reference_handle = $1', [referenceHandle])
            .then(results => {
                if (results.rowCount === 0) {
                    return null;
                }

                assert(results.rowCount === 1);
                return parseBucketDbResult(results.rows[0]);
            });
    },

    getAllForServer: function(db, server) {
        return db.query('SELECT bucket_id, server_id, channel_id, reference_handle, display_name FROM prompt_buckets WHERE server_id = $1', [server.id])
            .then(results => {
                const buckets = [];

                for (let index = 0; index < results.rowCount; ++index) {
                    buckets.push(parseBucketDbResult(results.rows[index]));
                }

                return buckets;
            });
    },
};
