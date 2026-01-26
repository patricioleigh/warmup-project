import type { NextFunction, Request, Response } from 'express';
import { requestIdMiddleware } from './request-id.middleware';

describe('requestIdMiddleware', () => {
  it('uses incoming x-request-id header and echoes it back', () => {
    const req = {
      header: (name: string) =>
        name.toLowerCase() === 'x-request-id' ? 'req_incoming' : undefined,
    } as unknown as Request;
    const res = { setHeader: jest.fn() } as unknown as Response;
    const next = jest.fn() as unknown as NextFunction;

    requestIdMiddleware(req, res, next);

    expect(req.requestId).toBe('req_incoming');
    expect((res.setHeader as unknown as jest.Mock).mock.calls[0]).toEqual([
      'x-request-id',
      'req_incoming',
    ]);
    expect(next).toHaveBeenCalled();
  });

  it('generates a request id when header is missing', () => {
    const req = { header: () => undefined } as unknown as Request;
    const res = { setHeader: jest.fn() } as unknown as Response;
    const next = jest.fn() as unknown as NextFunction;

    requestIdMiddleware(req, res, next);

    expect(typeof req.requestId).toBe('string');
    expect(req.requestId?.startsWith('req_')).toBe(true);
    expect(next).toHaveBeenCalled();
  });
});
