import MessageBase from 'message/base';
import { OfficialDiscordMessage, OfficialDiscordPayload } from 'official-discord';
import Phil from 'phil';

export class PrivateMessage extends MessageBase {
    constructor(event : OfficialDiscordPayload<OfficialDiscordMessage>, phil : Phil) {
        super(event, phil);
    }
}

export default PrivateMessage;
