import GlobalConfig from 'global-config';

const YouTube = require('youtube-node');

export interface IYoutubeVideo {
    id : string;
}

export namespace YouTubePromises {
    export function search(globalConfig: GlobalConfig, query: string): Promise<IYoutubeVideo[]> {
         // Their typing definition for search is wrong, and the repo seems dead.
         // Unlikely that I can submit a fix and have it get pushed live.

        const youtubeApi: any = new YouTube();
        youtubeApi.setKey(globalConfig.youtubeApiKey);

        return new Promise((resolve, reject) => {
            youtubeApi.search(query, 1, (err: Error, result: any) => {
                if (err) {
                    reject(err);
                    return;
                }

                const videos: IYoutubeVideo[] = [];
                for (const ytItem of result.items) {
                    videos.push({
                        id: ytItem.id.videoId
                    });
                }

                resolve(videos);
            });
        });
    }
}

export default YouTubePromises;
