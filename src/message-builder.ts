const PUBLIC_CHANNEL_CHARACTER_LIMIT: number = 2000;

/* Helps with the building of messages to send to Discord by ensuring that they're
always split prior to the max number of characters per message. */
export default class MessageBuilder {
    public readonly messages: string[] = [];

    public append(text : string) {
        if (!text) {
            return;
        }

        const currentMessageCount = this.countCurrentLine();
        const doesNewTextExceedMessage = (currentMessageCount + text.length > PUBLIC_CHANNEL_CHARACTER_LIMIT);
        if (this.messages.length === 0 || doesNewTextExceedMessage) {
            this.messages.push(text);
            return;
        }

        this.messages[this.messages.length - 1] += text;
    }

    private countCurrentLine() : number {
        if (this.messages.length === 0) {
            return 0;
        }

        return this.messages[this.messages.length - 1].length;
    }
}
