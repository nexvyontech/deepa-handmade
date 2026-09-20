import { RequestContextService } from './request-context.service.js';

describe('RequestContextService', () => {
  let service: RequestContextService;

  beforeEach(() => {
    service = new RequestContextService();
  });

  it('is empty outside a request scope', () => {
    expect(service.getRequestId()).toBeUndefined();
  });

  it('exposes the running request id inside the scope', () => {
    service.run({ requestId: 'abc-123' }, () => {
      expect(service.getRequestId()).toBe('abc-123');
    });
  });

  it('preserves an existing non-empty id', () => {
    expect(service.createRequestId('incoming-id')).toBe('incoming-id');
    expect(service.createRequestId('   ')).not.toBe('   ');
  });

  it('generates a new id when absent', () => {
    const generated = service.createRequestId(undefined);
    expect(generated).toBeTruthy();
    expect(service.createRequestId('')).not.toBe('');
  });
});