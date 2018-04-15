const YouTube = require('youtube-node');

export interface YoutubeVideo {
    id : string;
}

export namespace YouTubePromises {
    export function search(query : string) : Promise<YoutubeVideo[]> {
         // Their typing definition for search is wrong, and the repo seems dead.
         // Unlikely that I can submit a fix and have it get pushed live.

        const youtubeApi : any = new YouTube();
        youtubeApi.setKey(process.env.YOUTUBE_API_KEY);

        return new Promise((resolve, reject) => {
            youtubeApi.search(query, 1, (err : Error, result : any) => {
                if (err) {
                    reject(err);
                    return;
                }

                const videos : YoutubeVideo[] = [];
                for (let ytItem of result.items) {
                    videos.push({
                        id: ytItem.id.videoId
                    });
                }

                resolve(videos);
            });
        });
    }
}
