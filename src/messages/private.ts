import { OfficialDiscordMessage, OfficialDiscordPayload } from 'official-discord';
import Phil from '../phil';
import MessageBase from './base';

export class PrivateMessage extends MessageBase {
    constructor(event : OfficialDiscordPayload<OfficialDiscordMessage>, phil : Phil) {
        super(event, phil);
    }
}

export default PrivateMessage;
