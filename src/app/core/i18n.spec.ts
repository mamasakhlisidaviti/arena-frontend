import { describe, expect, it } from 'vitest';
import en from '../../assets/i18n/en.json';
import ka from '../../assets/i18n/ka.json';
import ru from '../../assets/i18n/ru.json';

type Dictionary = Record<string, unknown>;

function flattenKeys(value: Dictionary, prefix = ''): string[] {
  return Object.entries(value).flatMap(([key, child]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return child && typeof child === 'object' && !Array.isArray(child)
      ? flattenKeys(child as Dictionary, path)
      : [path];
  });
}

describe('translation dictionaries', () => {
  const kaKeys = flattenKeys(ka as Dictionary).sort();
  const enKeys = flattenKeys(en as Dictionary).sort();
  const ruKeys = flattenKeys(ru as Dictionary).sort();

  it('has the same keys in Georgian and English', () => {
    expect(enKeys).toEqual(kaKeys);
  });

  it('has the same keys in Georgian and Russian', () => {
    expect(ruKeys).toEqual(kaKeys);
  });

  it('does not contain empty translations', () => {
    for (const [name, dictionary] of Object.entries({ ka, en, ru })) {
      const empty = flattenKeys(dictionary as Dictionary).filter((key) => {
        const value = key
          .split('.')
          .reduce<unknown>((node, part) => (node as Dictionary)?.[part], dictionary);
        return typeof value === 'string' && value.trim() === '';
      });
      expect(empty, `${name}.json has empty values`).toEqual([]);
    }
  });
});
