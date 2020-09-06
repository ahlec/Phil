import Server from '@phil/discord/Server';

import Database from '@phil/database';
import LeaderboardEntry from './leaderboard-entry';

const LEADERBOARD_SIZE = 10;

interface DbResultsRow {
  suggesting_userid: string;
  score: string;
}

class Leaderboard {
  public static async getLeaderboard(
    server: Server,
    db: Database
  ): Promise<Leaderboard> {
    const results = await db.query<DbResultsRow>(
      `SELECT
          suggesting_userid,
          count(submission_id) as "score"
        FROM
          submission AS s
        JOIN
          prompt_buckets AS pb
        ON
          s.bucket_id = pb.bucket_id
        WHERE
          s.approved_by_admin = E'1' AND
          pb.server_id = $1
        GROUP BY
          suggesting_userid
        ORDER BY
          score DESC
        LIMIT $2`,
      [server.id, LEADERBOARD_SIZE]
    );

    const entries = await Promise.all(
      results.rows.map(
        async (row): Promise<LeaderboardEntry> => {
          const member = await server.getMember(row.suggesting_userid);
          return new LeaderboardEntry(
            member,
            row.suggesting_userid,
            parseInt(row.score, 10)
          );
        }
      )
    );

    return new Leaderboard(entries);
  }

  private constructor(public readonly entries: readonly LeaderboardEntry[]) {}
}

export default Leaderboard;
