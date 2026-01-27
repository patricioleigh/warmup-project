import { HnService } from './hn.service';
import { HttpService } from '@nestjs/axios';
import { of } from 'rxjs';

describe('HnService', () => {
  let service: HnService;
  let httpService: HttpService;
  let getMock: jest.Mock;

  beforeEach(() => {
    getMock = jest.fn();
    httpService = {
      get: getMock,
    } as any;

    service = new HnService(httpService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('fetchLatest', () => {
    it('should fetch data from Hacker News API', async () => {
      const mockResponse = {
        data: {
          hits: [{ objectID: '1', title: 'Test' }],
          page: 0,
          hitsPerPage: 20,
        },
      };

      (httpService.get as jest.Mock).mockReturnValue(of(mockResponse));

      const result = await service.fetchLatest('nodejs', 0, 20);

      expect(getMock).toHaveBeenCalledWith(
        'https://hn.algolia.com/api/v1/search_by_date',
        {
          params: { query: 'nodejs', page: 0, hitsPerPage: 20 },
          headers: { Accept: 'application/json' },
        },
      );
      expect(result).toEqual(mockResponse.data);
    });

    it('should use default parameters', async () => {
      const mockResponse = { data: { hits: [] } };
      (httpService.get as jest.Mock).mockReturnValue(of(mockResponse));

      await service.fetchLatest();

      expect(getMock).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          params: { query: 'node.js', page: 0, hitsPerPage: 20 },
        }),
      );
    });
  });

  describe('cleanHits', () => {
    it('should clean and filter valid hits', () => {
      const rawHits = [
        {
          objectID: '1',
          title: 'Valid Article',
          story_url: 'https://example.com',
          author: 'testuser',
          created_at: '2024-01-01T00:00:00.000Z',
        },
        {
          objectID: '2',
          story_title: 'Another Article',
          url: 'https://example2.com',
          author: 'user2',
          created_at: '2024-01-02T00:00:00.000Z',
        },
      ];

      const result = service.cleanHits(rawHits);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        hnObjectId: '1',
        title: 'Valid Article',
        url: 'https://example.com',
        author: 'testuser',
        createdAt: '2024-01-01T00:00:00.000Z',
      });
      expect(result[1]).toEqual({
        hnObjectId: '2',
        title: 'Another Article',
        url: 'https://example2.com',
        author: 'user2',
        createdAt: '2024-01-02T00:00:00.000Z',
      });
    });

    it('should filter out hits without objectID', () => {
      const rawHits = [
        { title: 'No ID', author: 'test', created_at: '2024-01-01' },
      ];

      const result = service.cleanHits(rawHits);

      expect(result).toHaveLength(0);
    });

    it('should filter out hits without author', () => {
      const rawHits = [
        {
          objectID: '1',
          title: 'No Author',
          created_at: '2024-01-01',
        },
      ];

      const result = service.cleanHits(rawHits);

      expect(result).toHaveLength(0);
    });

    it('should filter out hits without title', () => {
      const rawHits = [
        {
          objectID: '1',
          author: 'test',
          created_at: '2024-01-01',
        },
      ];

      const result = service.cleanHits(rawHits);

      expect(result).toHaveLength(0);
    });

    it('should filter out hits without created_at', () => {
      const rawHits = [
        {
          objectID: '1',
          title: 'No Date',
          author: 'test',
        },
      ];

      const result = service.cleanHits(rawHits);

      expect(result).toHaveLength(0);
    });

    it('should handle hits without URL', () => {
      const rawHits = [
        {
          objectID: '1',
          title: 'No URL',
          author: 'test',
          created_at: '2024-01-01',
        },
      ];

      const result = service.cleanHits(rawHits);

      expect(result).toHaveLength(1);
      expect(result[0].url).toBeNull();
    });

    it('should handle empty or null input', () => {
      expect(service.cleanHits([])).toEqual([]);
      expect(service.cleanHits(null)).toEqual([]);
    });
  });

  describe('fetchLatestClean', () => {
    it('should fetch and clean data', async () => {
      const mockRawData = {
        hits: [
          {
            objectID: '1',
            title: 'Test Article',
            author: 'testuser',
            created_at: '2024-01-01T00:00:00.000Z',
          },
        ],
        query: 'nodejs',
        page: 0,
        hitsPerPage: 20,
      };

      (httpService.get as jest.Mock).mockReturnValue(of({ data: mockRawData }));

      const result = await service.fetchLatestClean('nodejs', 0, 20);

      expect(result).toEqual({
        query: 'nodejs',
        page: 0,
        hitPerPage: 20,
        fetched: 1,
        kept: 1,
        hits: [
          {
            hnObjectId: '1',
            title: 'Test Article',
            url: null,
            author: 'testuser',
            createdAt: '2024-01-01T00:00:00.000Z',
          },
        ],
      });
    });

    it('should handle filtering invalid hits', async () => {
      const mockRawData = {
        hits: [
          {
            objectID: '1',
            title: 'Valid',
            author: 'test',
            created_at: '2024-01-01',
          },
          { objectID: '2', title: 'Invalid - no author' },
          { title: 'Invalid - no ID' },
        ],
        query: 'test',
        page: 0,
        hitsPerPage: 20,
      };

      (httpService.get as jest.Mock).mockReturnValue(of({ data: mockRawData }));

      const result = await service.fetchLatestClean('test', 0, 20);

      expect(result.fetched).toBe(3);
      expect(result.kept).toBe(1);
      expect(result.hits).toHaveLength(1);
    });
  });
});
