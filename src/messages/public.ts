import { Server as DiscordIOServer } from 'discord.io';
import {
  OfficialDiscordMessage,
  OfficialDiscordPayload,
} from 'official-discord';
import Phil from '../phil';
import ServerConfig from '../server-config';
import MessageBase from './base';

export class PublicMessage extends MessageBase {
  public readonly server: DiscordIOServer;

  constructor(
    event: OfficialDiscordPayload<OfficialDiscordMessage>,
    phil: Phil,
    public readonly serverConfig: ServerConfig
  ) {
    super(event, phil);
    this.server = this.serverConfig.server;
  }
}

export default PublicMessage;
