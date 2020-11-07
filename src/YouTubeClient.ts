import fetch from 'node-fetch';
import { isIndexableObject } from './utils/type-guards';

export interface YouTubeVideo {
  url: string;
}

interface SearchApiResponseItem {
  kind: 'youtube#searchResult';
  id: {
    kind: string;
    videoId: string;
    channelId: string;
    playlistId: string;
  };
}

interface SearchApiResponse {
  kind: 'youtube#searchListResponse';
  etag: string;
  nextPageToken: string;
  prevPageToken: string;
  regionCode: string;
  pageInfo: {
    totalResults: number;
    resultsPerPage: number;
  };
  items: readonly SearchApiResponseItem[];
}

function isSearchApiResponse(obj: unknown): obj is SearchApiResponse {
  if (!isIndexableObject(obj)) {
    return false;
  }

  if (obj['kind'] !== 'youtube#searchListResponse') {
    return false;
  }

  return true;
}

const SEARCH_API_URL = 'https://www.googleapis.com/youtube/v3/search';

class YouTubeClient {
  public constructor(private readonly key: string) {}

  public async search(
    query: string,
    maxResults: number
  ): Promise<readonly YouTubeVideo[]> {
    // Determine the URL for this request
    const params = new URLSearchParams();
    params.set('key', this.key);
    params.set('q', query);
    params.set('maxResults', maxResults.toString());
    params.set('part', 'snippet');
    const url = `${SEARCH_API_URL}?${params.toString()}`;
    params.set('key', '**REDACTED**');
    const redactedUrl = `${SEARCH_API_URL}?${params.toString()}`;

    // Make the request and process the results
    const response = await fetch(url);
    if (response.status !== 200) {
      throw new Error(
        `Received a status code of ${response.status} when querying: ${redactedUrl}`
      );
    }

    const body = await response.json();
    if (!isSearchApiResponse(body)) {
      throw new Error(
        `Received a non-expected body from YouTube search API when querying: ${redactedUrl}`
      );
    }

    return body.items.map(
      (responseItem): YouTubeVideo => ({
        url: `https://youtu.be/${responseItem.id.videoId}`,
      })
    );
  }
}

export default YouTubeClient;
