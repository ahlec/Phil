import { Database } from '../database';

export class UnconfirmedPromptTally {
    readonly bucketId : number;
    readonly bucketHandle : string;
    readonly bucketDisplayName : string;
    readonly numUnconfirmed : number;

    constructor(dbRow : any) {
        this.bucketId = parseInt(dbRow.bucket_id);
        this.bucketHandle = dbRow.reference_handle;
        this.bucketDisplayName = dbRow.display_name;
        this.numUnconfirmed = parseInt(dbRow.total);
    }

    static collectForServer(db : Database, serverId : string) : Promise<UnconfirmedPromptTally[]> {
        return db.query(`SELECT pb.bucket_id, reference_handle, display_name, count(*) as "total"
                FROM prompts p
                JOIN prompt_buckets pb
                    ON p.bucket_id = pb.bucket_id
                WHERE pb.server_id = $1 AND approved_by_admin = E'0'
                GROUP BY pb.bucket_id, pb.reference_handle, pb.display_name`, [serverId])
            .then(results => {
                var counts = [];

                for (let dbRow of results.rows) {
                    counts.push(new UnconfirmedPromptTally(dbRow));
                }

                return counts;
            });
    }
}
