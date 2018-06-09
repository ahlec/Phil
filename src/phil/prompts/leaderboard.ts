import { Client as DiscordIOClient, Server as DiscordIOServer } from 'discord.io';
import { QueryResult } from 'pg';
import { Bucket } from '../buckets';
import Database from '../database';
import LeaderboardEntry from './leaderboard-entry';

const LEADERBOARD_SIZE = 10;

export default class Leaderboard {
    public static getLeaderboard(bot: DiscordIOClient, db: Database, server: DiscordIOServer): Promise<Leaderboard> {
        return db.query(`SELECT suggesting_userid, suggesting_user, count(prompt_id) as "score"
                FROM prompts p
                JOIN prompt_buckets pb
                    ON p.bucket_id = pb.bucket_id
                WHERE approved_by_admin = E'1' AND pb.server_id = $1
                GROUP BY suggesting_userid, suggesting_user
                ORDER BY score DESC
                LIMIT $2`, [server.id, LEADERBOARD_SIZE])
            .then(results => new Leaderboard(bot, server, results));
    }

    public readonly entries: ReadonlyArray<LeaderboardEntry>;

    private constructor(bot: DiscordIOClient, server: DiscordIOServer, results: QueryResult) {
        const mutableEntries: LeaderboardEntry[] = [];
        for (const row of results.rows) {
            mutableEntries.push(new LeaderboardEntry(bot, server, row));
        }

        this.entries = mutableEntries;
    }
}
