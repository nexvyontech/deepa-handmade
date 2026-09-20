import { jest } from '@jest/globals';
import { ArgumentsHost, BadRequestException, HttpStatus } from '@nestjs/common';
import { Response } from 'express';
import { AllExceptionsFilter } from './all-exceptions.filter.js';
import { ApiException } from '../exceptions/api.exception.js';
import { ERROR_CODES } from '../errors/error-codes.js';

describe('AllExceptionsFilter', () => {
  let filter: AllExceptionsFilter;
  const request = {
    url: '/api/v1/test',
    method: 'GET',
    requestId: 'req-123',
  };
  const response = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };

  const makeHost = (): ArgumentsHost =>
    ({
      switchToHttp: () => ({
        getResponse: () => response as unknown as Response,
        getRequest: () => request,
      }),
    }) as unknown as ArgumentsHost;

  beforeEach(() => {
    response.status.mockClear();
    response.json.mockClear();
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('formats a Nest HttpException with a status-derived code', () => {
    filter = new AllExceptionsFilter('json', 'development');
    filter.catch(new BadRequestException('invalid payload'), makeHost());

    expect(response.status).toHaveBeenCalledWith(400);
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 400,
        code: ERROR_CODES.BAD_REQUEST,
        message: 'invalid payload',
        requestId: 'req-123',
        path: '/api/v1/test',
      }),
    );
  });

  it('preserves ApiException code and details', () => {
    filter = new AllExceptionsFilter('json', 'development');
    const apiError = ApiException.badRequest('boom', { field: ['x'] });
    filter.catch(apiError, makeHost());

    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: HttpStatus.BAD_REQUEST,
        code: ERROR_CODES.BAD_REQUEST,
        message: 'boom',
        details: { field: ['x'] },
      }),
    );
  });

  it('never leaks internal messages or stacks in production', () => {
    filter = new AllExceptionsFilter('json', 'production');
    const internal = new Error('mongodb://user:p4ss@private-host:27017/db exploded');

    filter.catch(internal, makeHost());

    const body = response.json.mock.calls[0][0] as unknown as {
      message: string;
      code: string;
      statusCode: number;
      stack?: string;
    };
    expect(body.message).toBe('Internal server error');
    expect(body.code).toBe(ERROR_CODES.INTERNAL_SERVER_ERROR);
    expect(body.statusCode).toBe(500);
    expect(JSON.stringify(body)).not.toContain('p4ss');
    expect(JSON.stringify(body)).not.toContain('private-host');
    expect(body.stack).toBeUndefined();
  });

  it('exposes the real message in development', () => {
    filter = new AllExceptionsFilter('json', 'development');
    filter.catch(new Error('cursor bug'), makeHost());

    const body = response.json.mock.calls[0][0] as unknown as {
      message: string;
      stack?: string;
    };
    expect(body.message).toBe('cursor bug');
    expect(body.stack).toBeUndefined();
  });
});