import Database from '../database';

export default class UnconfirmedSubmissionTally {
  public static async collectForServer(
    db: Database,
    serverId: string
  ): Promise<UnconfirmedSubmissionTally[]> {
    const results = await db.query(
      `SELECT
        pb.bucket_id,
        pb.reference_handle,
        pb.display_name,
        count(*) as "total"
      FROM
        submission AS s
      JOIN
        prompt_buckets AS pb
      ON
        s.bucket_id = pb.bucket_id
      WHERE
        pb.server_id = $1 AND
        s.approved_by_admin = E'0'
      GROUP BY
        pb.bucket_id,
        pb.reference_handle,
        pb.display_name`,
      [serverId]
    );

    return results.rows.map(row => new UnconfirmedSubmissionTally(row));
  }

  public readonly bucketId: number;
  public readonly bucketHandle: string;
  public readonly bucketDisplayName: string;
  public readonly numUnconfirmed: number;

  private constructor(dbRow: any) {
    this.bucketId = parseInt(dbRow.bucket_id, 10);
    this.bucketHandle = dbRow.reference_handle;
    this.bucketDisplayName = dbRow.display_name;
    this.numUnconfirmed = parseInt(dbRow.total, 10);
  }
}
