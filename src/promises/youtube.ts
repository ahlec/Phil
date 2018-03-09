// This file half exists to wrap things in promises.
// The other half of this file is because they clearly didn't know how to use TypeScript.

import { YtResult } from 'youtube-node';
const YouTube = require('youtube-node');

export namespace YouTubePromises {
    export function search(query : string) : Promise<YtResult> {
         // Their typing definition for search is wrong, and the repo seems dead.
         // Unlikely that I can submit a fix and have it get pushed live.

        const youtubeApi : any = new YouTube();
        youtubeApi.setKey(process.env.YOUTUBE_API_KEY);

        return new Promise((resolve, reject) => {
            youtubeApi.search(query, 1, (err : Error, result : YtResult) => {
                if (err) {
                    reject(err);
                    return;
                }

                resolve(result);
            });
        });
    }
}
