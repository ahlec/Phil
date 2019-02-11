import { QueryResult } from 'pg';

export default class DatabaseResult<TRow> {
  public readonly rowCount: number;
  public readonly rows: ReadonlyArray<Readonly<TRow>>;

  constructor(queryResult: QueryResult) {
    this.rowCount = queryResult.rowCount;
    this.rows = queryResult.rows;
  }

  public transform<TOutput>(
    transformation: (rows: ReadonlyArray<Readonly<TRow>>) => TOutput
  ): TOutput {
    return transformation(this.rows);
  }

  public toReadonlySet<TOutput>(
    transform: (row: TRow) => TOutput
  ): ReadonlySet<TOutput> {
    return new Set<TOutput>(this.rows.map(transform));
  }
}
