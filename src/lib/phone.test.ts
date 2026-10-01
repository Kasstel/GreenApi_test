import { describe, expect, it } from 'vitest';
import { formatRecipient, parsePhone, parseRecipient } from './phone';

describe('parsePhone', () => {
  it('нормализует российский 8XXXXXXXXXX -> 7XXXXXXXXXX без плюса', () => {
    expect(parsePhone('8 (912) 345-67-89')).toEqual({ ok: true, value: 79123456789 });
  });

  it('оставляет +7 как есть', () => {
    expect(parsePhone('+7 912 345 67 89')).toEqual({ ok: true, value: 79123456789 });
  });

  it('не трогает чужой код страны с плюсом (+81, +86)', () => {
    expect(parsePhone('+81 90 1234 5678')).toEqual({ ok: true, value: 819012345678 });
    expect(parsePhone('+86 138 0013 8000')).toEqual({ ok: true, value: 8613800138000 });
  });

  it('не заменяет 8 на 7, если был явный + (даже при 11 цифрах)', () => {
    expect(parsePhone('+8 912 345 67 89')).toEqual({ ok: true, value: 89123456789 });
  });

  it('отклоняет короткий ввод', () => {
    const r = parsePhone('12345');
    expect(r.ok).toBe(false);
  });

  it('отклоняет слишком длинный ввод', () => {
    expect(parsePhone('+1234567890123456').ok).toBe(false);
  });

  it('отклоняет пустую строку и буквы', () => {
    expect(parsePhone('   ').ok).toBe(false);
    expect(parsePhone('+7 912 abc 67 89').ok).toBe(false);
  });

  it('отклоняет код страны с 0', () => {
    expect(parsePhone('0123456789').ok).toBe(false);
  });
});

describe('parseRecipient', () => {
  it('распознаёт @username', () => {
    expect(parseRecipient('@durov_bot')).toEqual({
      ok: true,
      value: { kind: 'username', username: '@durov_bot' },
    });
  });

  it('добавляет @ к username без него', () => {
    expect(parseRecipient('durov')).toEqual({
      ok: true,
      value: { kind: 'username', username: '@durov' },
    });
  });

  it('понимает ссылку t.me', () => {
    expect(parseRecipient('https://t.me/durov')).toEqual({
      ok: true,
      value: { kind: 'username', username: '@durov' },
    });
  });

  it('отклоняет некорректный username', () => {
    expect(parseRecipient('@abc').ok).toBe(false);
    expect(parseRecipient('@1abcde').ok).toBe(false);
    expect(parseRecipient('@abc-def').ok).toBe(false);
  });

  it('распознаёт номер телефона', () => {
    expect(parseRecipient('89123456789')).toEqual({
      ok: true,
      value: { kind: 'phone', phoneNumber: 79123456789 },
    });
  });

  it('пробрасывает ошибку номера', () => {
    expect(parseRecipient('123').ok).toBe(false);
    expect(parseRecipient('').ok).toBe(false);
  });
});

describe('formatRecipient', () => {
  it('форматирует номер и username', () => {
    expect(formatRecipient({ kind: 'phone', phoneNumber: 79123456789 })).toBe('+79123456789');
    expect(formatRecipient({ kind: 'username', username: '@durov' })).toBe('@durov');
  });
});
