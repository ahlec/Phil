module.exports = function(databaseUrl) {
    const pg = require('pg');
    const pool = new pg.Pool({ connectionString: databaseUrl });

    return {
        query: function(text, values) {
            return new Promise((resolve, reject) => {
                pool.connect(function(error, client, done) {
                    client.query(text, values, function(err, result) {
                        done();
                        if (err) {
                            reject(err);
                        } else {
                            resolve(result);
                        }
                    });
                });
            });
        }
    };
};