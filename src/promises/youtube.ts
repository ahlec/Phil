import { YouTube } from 'youtube-node';
import GlobalConfig from '../GlobalConfig';

export interface YoutubeVideo {
  id: string;
}

export function searchYouTube(query: string): Promise<YoutubeVideo[]> {
  const youtubeApi = new YouTube();
  youtubeApi.setKey(GlobalConfig.youtubeApiKey);

  return new Promise((resolve, reject) => {
    youtubeApi.search(query, 1, (err, result) => {
      if (err) {
        reject(err);
        return;
      }

      if (!result || !result.items) {
        reject(new Error('Response from API did not include expected data.'));
        return;
      }

      const videos: YoutubeVideo[] = [];
      for (const ytItem of result.items) {
        if (!ytItem.id) {
          reject(
            new Error("Response included an item that doesn't have an ID.")
          );
          return;
        }

        if (!ytItem.id.videoId) {
          reject(
            new Error('Response included an item whose videoId was empty.')
          );
          return;
        }

        videos.push({
          id: ytItem.id.videoId,
        });
      }

      resolve(videos);
    });
  });
}
