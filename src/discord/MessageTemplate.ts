import MessageBuilder from '@phil/message-builder';

type RecognizedEmbedColor = 'purple' | 'powder-blue' | 'red' | 'green';

export interface EmbedField {
  name: string;
  value?: string;
  inline?: boolean;
}

type MessageTemplate =
  | {
      type: 'plain';
      text: string | MessageBuilder;
    }
  | {
      type: 'error';
      error: string;
    }
  | {
      type: 'success';
      text: string;
    }
  | {
      color: RecognizedEmbedColor;
      description: string | null;
      fields: readonly EmbedField[] | null;
      footer: string | null;
      type: 'embed';
      title: string;
    };

export default MessageTemplate;
