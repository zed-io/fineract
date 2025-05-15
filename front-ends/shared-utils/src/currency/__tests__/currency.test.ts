import { formatCurrency, parseCurrency, convertCurrency, Decimal } from '../index';

describe('Currency Utilities', () => {
  describe('formatCurrency', () => {
    it('should format a currency amount with default options', () => {
      expect(formatCurrency(1234.56, { code: 'USD' })).toBe('$1,234.56');
    });

    it('should format a currency amount with custom decimal places', () => {
      expect(formatCurrency(1234.56, { code: 'USD', decimalPlaces: 0 })).toBe('$1,235');
      expect(formatCurrency(1234.56, { code: 'USD', decimalPlaces: 3 })).toBe('$1,234.560');
    });

    it('should format a currency amount with custom symbol', () => {
      expect(formatCurrency(1234.56, { code: 'USD', symbol: '💲' })).toBe('💲1,234.56');
    });

    it('should format a currency amount with currency code', () => {
      expect(formatCurrency(1234.56, { code: 'USD', showCode: true })).toBe('$1,234.56 USD');
    });

    it('should format a currency amount with different locale', () => {
      expect(formatCurrency(1234.56, { code: 'EUR', locale: 'de-DE' })).toMatch(/€1\.234,56/);
    });

    it('should handle string inputs', () => {
      expect(formatCurrency('1234.56', { code: 'USD' })).toBe('$1,234.56');
    });

    it('should handle Decimal inputs', () => {
      expect(formatCurrency(new Decimal(1234.56), { code: 'USD' })).toBe('$1,234.56');
    });
  });

  describe('parseCurrency', () => {
    it('should parse a currency string with default options', () => {
      expect(parseCurrency('$1,234.56').equals(new Decimal(1234.56))).toBe(true);
    });

    it('should parse a currency string with currency code', () => {
      expect(parseCurrency('$1,234.56 USD', { code: 'USD' }).equals(new Decimal(1234.56))).toBe(true);
    });

    it('should parse a currency string with different locale', () => {
      expect(parseCurrency('1.234,56 €', { locale: 'de-DE', code: 'EUR' }).equals(new Decimal(1234.56))).toBe(true);
    });

    it('should throw an error for invalid currency strings', () => {
      expect(() => parseCurrency('invalid')).toThrow();
    });
  });

  describe('convertCurrency', () => {
    it('should convert a currency amount using exchange rate', () => {
      expect(convertCurrency(1000, 1.15).equals(new Decimal(1150))).toBe(true);
    });

    it('should handle string inputs', () => {
      expect(convertCurrency('1000', '1.15').equals(new Decimal(1150))).toBe(true);
    });

    it('should handle Decimal inputs', () => {
      expect(convertCurrency(new Decimal(1000), new Decimal(1.15)).equals(new Decimal(1150))).toBe(true);
    });
  });
});