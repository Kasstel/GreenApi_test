import type { Recipient, Result } from '../api/types';

const MIN_DIGITS = 10;
const MAX_DIGITS = 15;

const USERNAME_RE = /^[a-zA-Z][a-zA-Z0-9_]{4,31}$/;
const PHONE_CHARS_RE = /^\+?[\d\s()\-.]+$/;
const TME_PREFIX_RE = /^(?:https?:\/\/)?(?:www\.)?t(?:elegram)?\.me\//i;

export function parsePhone(input: string): Result<number> {
  const trimmed = input.trim();
  if (!trimmed) return { ok: false, error: 'Введите номер телефона' };
  if (!PHONE_CHARS_RE.test(trimmed)) {
    return { ok: false, error: 'Номер может содержать только цифры, +, пробелы, скобки и дефисы' };
  }

  const hadPlus = trimmed.startsWith('+');
  let digits = trimmed.replace(/\D/g, '');

  if (!hadPlus && digits.length === 11 && digits.startsWith('8')) {
    digits = `7${digits.slice(1)}`;
  }

  if (digits.length < MIN_DIGITS) {
    return { ok: false, error: 'Слишком короткий номер — укажите его с кодом страны' };
  }
  if (digits.length > MAX_DIGITS) {
    return { ok: false, error: 'Слишком длинный номер' };
  }
  if (digits.startsWith('0')) {
    return { ok: false, error: 'Код страны не может начинаться с 0' };
  }

  return { ok: true, value: Number(digits) };
}

export function parseRecipient(input: string): Result<Recipient> {
  const trimmed = input.trim().replace(TME_PREFIX_RE, '');
  if (!trimmed) return { ok: false, error: 'Введите номер телефона или @username' };

  const looksLikeUsername = trimmed.startsWith('@') || /^[a-zA-Z]/.test(trimmed);
  if (looksLikeUsername) {
    const name = trimmed.replace(/^@/, '');
    if (!USERNAME_RE.test(name)) {
      return {
        ok: false,
        error: 'Username: 5–32 символа, латиница, цифры и _, начинается с буквы',
      };
    }
    return { ok: true, value: { kind: 'username', username: `@${name}` } };
  }

  const phone = parsePhone(trimmed);
  return phone.ok ? { ok: true, value: { kind: 'phone', phoneNumber: phone.value } } : phone;
}

export function formatRecipient(recipient: Recipient): string {
  return recipient.kind === 'phone' ? `+${recipient.phoneNumber}` : recipient.username;
}
