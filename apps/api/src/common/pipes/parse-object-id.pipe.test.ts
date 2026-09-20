import { HttpStatus } from '@nestjs/common';
import { ParseObjectIdPipe } from './parse-object-id.pipe.js';
import { ERROR_CODES } from '../errors/error-codes.js';

describe('ParseObjectIdPipe', () => {
  const pipe = new ParseObjectIdPipe();

  it('passes through a valid ObjectId', () => {
    const id = '507f1f77bcf86cd799439011';
    expect(pipe.transform(id, { metatype: String, type: 'param', data: 'id' })).toBe(id);
  });

  it('passes through a valid 24-hex id', () => {
    const id = 'ABCDEFabcdef0123456789ab';
    expect(pipe.transform(id, { metatype: String, type: 'query', data: 'id' })).toBe(id);
  });

  it('rejects a malformed id', () => {
    expect(() =>
      pipe.transform('not-an-id', { metatype: String, type: 'param', data: 'id' }),
    ).toThrow(
      expect.objectContaining({
        status: HttpStatus.BAD_REQUEST,
        code: ERROR_CODES.INVALID_OBJECT_ID,
      }),
    );
  });

  it('rejects a short hex string', () => {
    expect(() =>
      pipe.transform('507f1f77bcf8', { metatype: String, type: 'param', data: 'id' }),
    ).toThrow(expect.objectContaining({ code: ERROR_CODES.INVALID_OBJECT_ID }));
  });
});