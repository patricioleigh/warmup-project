import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { firstValueFrom } from 'rxjs';
import { CleanHnItem } from './clean.types';

function asSafeString(value: unknown): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'bigint') return value.toString();
  return '';
}

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

  cleanHits(hits: unknown): CleanHnItem[] {
    const arr = Array.isArray(hits) ? hits : [];
    return arr
      .map((hit: unknown) => {
        const record = hit as Record<string, unknown> | null;

        const hnObjectId = asSafeString(record?.objectID).trim();
        if (!hnObjectId) return null;

        const author = asSafeString(record?.author).trim();
        if (!author) return null;

        const createdAt = asSafeString(record?.created_at).trim();
        if (!createdAt) return null;

        const title = asSafeString(record?.story_title ?? record?.title).trim();
        if (!title) return null;

        const urlValue = record?.story_url ?? record?.url;
        const urlString = asSafeString(urlValue).trim();
        const url = urlString ? urlString : null;

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
