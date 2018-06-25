import Database from 'database';

export default class Feature {
    constructor(public readonly id: number,
        public readonly displayName: string,
        public readonly names: ReadonlyArray<string>) {
    }

    public is(name: string): boolean {
        if (!name || name.length === 0) {
            return false;
        }

        name = name.toLowerCase();
        return (this.names.indexOf(name) >= 0);
    }

    public async getIsEnabled(db: Database, serverId: string): Promise<boolean> {
        const results = await db.query('SELECT is_enabled FROM server_features WHERE server_id = $1 AND feature_id = $2 LIMIT 1', [serverId, this.id]);
        if (results.rowCount === 0) {
            return true;
        }

        return (parseInt(results.rows[0].is_enabled, 10) === 1);
    }

    public async setIsEnabled(db: Database, serverId: string, enabled: boolean): Promise<void> {
        const enabledBit = (enabled ? 1 : 0);
        const results = await db.query(`UPDATE server_features
                SET is_enabled = $1
                WHERE server_id = $2 AND feature_id = $3`, [enabledBit, serverId, this.id]);
        if (results.rowCount > 0) {
            return;
        }

        return this.insertNewDatabaseRow(db, serverId, enabledBit);
    }

    public getInformationalDisplayLine(): string {
        let displayLine = this.displayName + ': ';

        let isFirstName = true;
        for (const name of this.names) {
            if (isFirstName) {
                isFirstName = false;
            } else {
                displayLine += ', ';
            }

            displayLine += '`' + name + '`';
        }

        return displayLine;
    }

    private async insertNewDatabaseRow(db: Database, serverId: string, enabledBit: number): Promise<void> {
        const results = await db.query(`INSERT INTO
                server_features(server_id, feature_id, is_enabled)
                VALUES($1, $2, $3)`, [serverId, this.id, enabledBit])
        if (results.rowCount !== 1) {
            throw new Error('Unable to insert a new record into the `server_features` database.');
        };
    }
}
