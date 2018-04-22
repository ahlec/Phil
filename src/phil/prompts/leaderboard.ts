import { Client as DiscordIOClient, Server as DiscordIOServer } from 'discord.io';
import { Bucket } from '../buckets';
import { Database } from '../database';
import { QueryResult } from 'pg';
import { BotUtils } from '../utils';

const LEADERBOARD_SIZE = 10;

export class LeaderboardEntry {
    readonly userId : string;
    readonly displayName : string;
    readonly isStillInServer : boolean;
    readonly score : number;

    constructor(bot : DiscordIOClient, server : DiscordIOServer, dbRow : any) {
        this.userId = dbRow.suggesting_userid;

        const member = server.members[this.userId];
        const currentUserDisplayName = BotUtils.getUserDisplayName(bot, server.id, this.userId);

        this.displayName = (currentUserDisplayName || dbRow.suggesting_user);
        this.isStillInServer = (member != null);
        this.score = parseInt(dbRow.score);
    }
}

export class Leaderboard {
    readonly entries : LeaderboardEntry[] = [];

    constructor(bot : DiscordIOClient, server : DiscordIOServer, results : QueryResult) {
        for (let index = 0; index < results.rowCount; ++index) {
            this.entries.push(new LeaderboardEntry(bot, server, results.rows[index]));
        }
    }

    static getLeaderboard(bot : DiscordIOClient, db : Database, server : DiscordIOServer) : Promise<Leaderboard> {
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
}
