import { Client as DiscordIOClient } from 'discord.io';

import Bucket from './buckets';
import Database from './database';

type BucketRetrieval =
  | {
      type: 'reference-handle';
      handle: string;
    }
  | {
      type: 'channel';
      channelId: string;
    };

class ServerBucketsCollection {
  public constructor(
    private readonly discord: DiscordIOClient,
    private readonly database: Database,
    private readonly serverId: string
  ) {}

  public async getAll(): Promise<readonly Bucket[]> {
    return Bucket.getAllForServer(this.discord, this.database, this.serverId);
  }

  public async retrieve(retrieval: BucketRetrieval): Promise<Bucket | null> {
    switch (retrieval.type) {
      case 'reference-handle': {
        const server = this.discord.servers[this.serverId];
        return Bucket.getFromReferenceHandle(
          this.discord,
          this.database,
          server,
          retrieval.handle
        );
      }
      case 'channel': {
        return Bucket.getFromChannelId(
          this.discord,
          this.database,
          retrieval.channelId
        );
      }
    }
  }
}

export default ServerBucketsCollection;
