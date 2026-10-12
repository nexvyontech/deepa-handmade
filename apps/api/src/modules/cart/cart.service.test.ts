import { ApiException } from '../../common/exceptions/api.exception.js';
import type { AuthenticatedUser } from '../../common/guards/auth.guard.js';
import { SettingsService } from '../settings/settings.service.js';
import { ShippingCalculatorService } from '../shipping/shipping-calculator.service.js';
import { CartService } from './cart.service.js';

const VALID_SESSION = '3f2504e0-4f89-41d3-9a0c-0305e82c3301';

function makeService(): CartService {
  return new CartService(
    new ShippingCalculatorService(),
    new SettingsService(undefined as never),
    undefined as never,
    undefined as never,
    undefined as never,
    undefined as never,
  );
}

describe('CartService identity + availability', () => {
  const service = makeService();

  describe('resolveIdentity', () => {
    it('keys authenticated callers by owner', () => {
      const user = { id: '6650f0c0a1b2c3d4e5f60718' } as AuthenticatedUser;
      expect(service.resolveIdentity(user, undefined)).toEqual({ ownerId: user.id });
      expect(service.resolveIdentity(user, 'not-a-valid-session')).toEqual({ ownerId: user.id });
    });

    it('keys guests by their uuid v4 session header', () => {
      expect(service.resolveIdentity(undefined, VALID_SESSION)).toEqual({ sessionId: VALID_SESSION });
    });

    it('rejects guests without a valid session', () => {
      expect(() => service.resolveIdentity(undefined, undefined)).toThrow(ApiException);
      expect(() => service.resolveIdentity(undefined, 'nope')).toThrow(ApiException);
      expect(() => service.resolveIdentity(undefined, '3f2504e0-4f89-11d3-9a0c-0305e82c3301')).toThrow(
        ApiException,
      );
    });
  });

  describe('when the database is unavailable', () => {
    it('reports the cart service as unavailable', async () => {
      await expect(service.getDetailed({ sessionId: VALID_SESSION })).rejects.toBeInstanceOf(ApiException);
    });
  });
});