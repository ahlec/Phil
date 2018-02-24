'use strict';

import { Database } from './database';

export class Feature {
    constructor(public readonly id : number, public readonly displayName : string, public readonly names : string[]) {
    }

    is(name : string) : boolean {
        if (!name || name.length === 0) {
            return false;
        }

        name = name.toLowerCase();
        return (this.names.indexOf(name) >= 0);
    }

    getIsEnabled(db : Database, serverId : string) : Promise<boolean> {
        return db.query('SELECT is_enabled FROM server_features WHERE server_id = $1 AND feature_id = $2 LIMIT 1', [serverId, this.id])
            .then(results => {
                if (results.rowCount === 0) {
                    return true;
                }

                return (parseInt(results.rows[0].is_enabled) === 1);
            });
    }

    setIsEnabled(db : Database, serverId : string, enabled : boolean) : Promise<void> {
        const enabledBit = (enabled ? 1 : 0);
        return db.query(`UPDATE server_features
                SET is_enabled = $1
                WHERE server_id = $2 AND feature_id = $3`, [enabledBit, serverId, this.id])
            .then(results => {
                if (results.rowCount > 0) {
                    return;
                }

                return this.insertNewDatabaseRow(db, serverId, enabledBit);
            });
    }

    private insertNewDatabaseRow(db : Database, serverId : string, enabledBit : number) : Promise<void> {
        return db.query(`INSERT INTO
                server_features(server_id, feature_id, is_enabled)
                VALUES($1, $2, $3)`, [serverId, this.id, enabledBit])
            .then(results => {
                if (results.rowCount !== 1) {
                    throw new Error('Unable to insert a new record into the `server_features` database.');
                }
            });
    }
}

export const Features = {
    Prompts: new Feature(1, 'Prompts', ['prompt', 'prompts']),
    TimezoneProcessing: new Feature(2, 'Timezone Processing', ['timezone', 'timezones', 'tz'])
};
