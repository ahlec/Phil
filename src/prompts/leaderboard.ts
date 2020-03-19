import Database, { DatabaseResult } from '@phil/database';
import DiscordClient from '@phil/discord/Client';
import Server from '@phil/discord/Server';
import LeaderboardEntry from './leaderboard-entry';

const LEADERBOARD_SIZE = 10;

interface DbResultsRow {
  suggesting_userid: string;
  score: string;
}

export default class Leaderboard {
  public static async getLeaderboard(
    client: DiscordClient,
    db: Database,
    server: Server
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
      [server.serverId, LEADERBOARD_SIZE]
    );
    return new Leaderboard(client, server, results);
  }

  public readonly entries: ReadonlyArray<LeaderboardEntry>;

  private constructor(
    client: DiscordClient,
    server: Server,
    results: DatabaseResult<DbResultsRow>
  ) {
    const mutableEntries: LeaderboardEntry[] = [];
    for (const row of results.rows) {
      mutableEntries.push(
        new LeaderboardEntry(
          client,
          server,
          row.suggesting_userid,
          parseInt(row.score, 10)
        )
      );
    }

    this.entries = mutableEntries;
  }
}
