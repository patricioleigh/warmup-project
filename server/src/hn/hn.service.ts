import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { firstValueFrom } from 'rxjs';
import { CleanHnItem } from './clean.types';

@Injectable()
export class HnService {
  private readonly baseUrl = 'https://hn.algolia.com/api/v1';

  constructor(private readonly http: HttpService) {}

  async fetchLatest(query = 'node.js', page = 0, hitsPerPage = 20) {
    const url = `${this.baseUrl}/search_by_date`;

    const res = await firstValueFrom(
      this.http.get(url, {
        params: { query, page, hitsPerPage },
        headers: { Accept: `application/json` },
      }),
    );

    return res.data;
  }

  cleanHits(hits: any[]): CleanHnItem[] {
    return (hits ?? [])
      .map((hit) => {
        const hnObjectId = String(hit?.objectID ?? '').trim();
        if (!hnObjectId) return null;

        const author = String(hit?.author ?? '').trim();
        if (!author) return null;

        const createdAt = String(hit?.created_at ?? '').trim();
        if (!createdAt) return null;

        const title = String(hit?.story_title ?? hit?.title ?? '').trim();
        if (!title) return null;

        const url =
          (hit?.story_url ?? hit?.url ?? null)
            ? String(hit.story_url ?? hit.url)
            : null;

        return { hnObjectId, title, url, author, createdAt };
      })
      .filter((x): x is CleanHnItem => x != null);
  }

  async fetchLatestClean(query = 'node.js', page = 0, hitsPerPage = 20) {
    const raw = await this.fetchLatest(query, page, hitsPerPage);
    const clean = this.cleanHits(raw?.hits ?? []);

    return {
      query: raw?.query ?? query,
      page: raw?.page ?? page,
      hitPerPage: raw?.hitsPerPage ?? hitsPerPage,
      fetched: Array.isArray(raw?.hits) ? raw.hits.length : 0,
      kept: clean.length,
      hits: clean,
    };
  }
}
