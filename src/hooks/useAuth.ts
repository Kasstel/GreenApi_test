import { useCallback, useMemo, useState } from 'react';
import { GreenApiClient, GreenApiError } from '../api/greenApi';
import type { Credentials, Result } from '../api/types';

const STORAGE_PREFIX = 'tg-green-chat:';
const STORAGE_KEY = `${STORAGE_PREFIX}credentials`;

const STATE_MESSAGES: Record<string, string> = {
  notAuthorized:
    'Инстанс не авторизован. Войдите в Telegram в кабинете GREEN-API (номер телефона + код).',
  blocked: 'Инстанс заблокирован.',
  sleepMode: 'Инстанс в спящем режиме. Откройте кабинет GREEN-API, чтобы разбудить его.',
  starting: 'Инстанс запускается. Повторите попытку через минуту.',
  yellowCard: 'Отправка сообщений приостановлена (yellowCard).',
};

function loadCredentials(): Credentials | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<Credentials>;
    return parsed.apiUrl && parsed.idInstance && parsed.apiTokenInstance
      ? (parsed as Credentials)
      : null;
  } catch {
    return null;
  }
}

function saveCredentials(creds: Credentials | null) {
  try {
    if (creds) {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(creds));
      return;
    }
    Object.keys(sessionStorage)
      .filter((key) => key.startsWith(STORAGE_PREFIX))
      .forEach((key) => sessionStorage.removeItem(key));
  } catch {}
}

export function validateCredentials(input: Credentials): Result<Credentials> {
  const creds: Credentials = {
    apiUrl: input.apiUrl.trim().replace(/\/+$/, ''),
    idInstance: input.idInstance.trim(),
    apiTokenInstance: input.apiTokenInstance.trim(),
  };
  if (!/^https?:\/\/[^\s/]+/i.test(creds.apiUrl)) {
    return { ok: false, error: 'apiUrl должен начинаться с https://' };
  }
  if (!/^\d+$/.test(creds.idInstance)) {
    return { ok: false, error: 'idInstance состоит только из цифр' };
  }
  if (!creds.apiTokenInstance) {
    return { ok: false, error: 'Введите apiTokenInstance' };
  }
  return { ok: true, value: creds };
}

export function useAuth() {
  const [credentials, setCredentials] = useState<Credentials | null>(loadCredentials);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const client = useMemo(
    () => (credentials ? new GreenApiClient(credentials) : null),
    [credentials],
  );

  const login = useCallback(async (input: Credentials) => {
    const valid = validateCredentials(input);
    if (!valid.ok) {
      setError(valid.error);
      return;
    }

    setChecking(true);
    setError(null);
    try {
      const { stateInstance } = await new GreenApiClient(valid.value).getStateInstance();
      if (stateInstance === 'authorized') {
        saveCredentials(valid.value);
        setCredentials(valid.value);
      } else {
        setError(STATE_MESSAGES[stateInstance] ?? `Неожиданное состояние инстанса: ${stateInstance}`);
      }
    } catch (e) {
      setError(e instanceof GreenApiError ? e.userMessage : 'Не удалось проверить инстанс');
    } finally {
      setChecking(false);
    }
  }, []);

  const logout = useCallback(() => {
    saveCredentials(null);
    setCredentials(null);
    setError(null);
  }, []);

  return { credentials, client, checking, error, login, logout };
}
