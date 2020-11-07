import Database from './index';

class InfoField {
  public constructor(
    private readonly db: Database,
    public readonly key: string
  ) {}

  public async getValue(): Promise<string | null> {
    const row = await this.db.querySingle<{ value: string }>(
      'SELECT value FROM info WHERE key = $1',
      [this.key]
    );
    if (!row) {
      return null;
    }

    return row.value;
  }

  public async setValue(value: string): Promise<void> {
    const numRowsUpdated = await this.db.execute(
      'UPDATE info SET value = $1 WHERE key = $2',
      [value, this.key]
    );
    if (numRowsUpdated) {
      return;
    }

    const numRowsInserted = await this.db.execute(
      'INSERT INTO info(key, value) VALUES($1, $2)',
      [this.key, value]
    );
    if (numRowsInserted) {
      return;
    }

    throw new Error(`Could not set info field for key '${this.key}'.`);
  }
}

export default InfoField;
