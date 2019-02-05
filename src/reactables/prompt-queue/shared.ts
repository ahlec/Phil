export namespace PromptQueueReactableShared {
  export interface Data {
    currentPage: number;
    totalNumberPages: number;
    pageSize: number;
    bucket: number;
  }

  export const ReactableHandle = 'prompt-queue';

  export namespace Emoji {
    export const Previous = '◀';
    export const Next = '▶';
  }
}

export default PromptQueueReactableShared;
