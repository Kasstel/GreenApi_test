import { useEffect, useRef, useState } from 'react';
import { GreenApiError, type GreenApiClient } from '../api/greenApi';
import type { ChatEvent } from '../api/types';
import { parseNotification } from '../lib/notifications';

export type PollingStatus = 'stopped' | 'connecting' | 'online' | 'error';

const RECEIVE_TIMEOUT_SEC = 5;
const BACKOFF_START_MS = 1_000;
const BACKOFF_MAX_MS = 30_000;

function isAbort(e: unknown): boolean {
  return e instanceof DOMException && e.name === 'AbortError';
}

function sleep(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    const timer = setTimeout(resolve, ms);
    signal.addEventListener(
      'abort',
      () => {
        clearTimeout(timer);
        resolve();
      },
      { once: true },
    );
  });
}

interface Options {
  onEvent: (event: ChatEvent) => void;
  onFatalError?: (error: GreenApiError) => void;
}

export function usePolling(client: GreenApiClient | null, { onEvent, onFatalError }: Options) {
  const [status, setStatus] = useState<PollingStatus>('stopped');
  const [lastError, setLastError] = useState<string | null>(null);

  const onEventRef = useRef(onEvent);
  const onFatalRef = useRef(onFatalError);
  useEffect(() => {
    onEventRef.current = onEvent;
    onFatalRef.current = onFatalError;
  });

  useEffect(() => {
    if (!client) {
      setStatus('stopped');
      return;
    }

    const controller = new AbortController();
    const { signal } = controller;

    async function loop(api: GreenApiClient) {
      let backoff = 0;
      setStatus('connecting');

      while (!signal.aborted) {
        try {
          const notification = await api.receiveNotification(RECEIVE_TIMEOUT_SEC, signal);
          if (signal.aborted) break;
          backoff = 0;
          setStatus('online');
          setLastError(null);

          if (!notification) continue;

          try {
            const event = parseNotification(notification.body);
            if (event.kind !== 'ignored') onEventRef.current(event);
          } catch (e) {
            console.error('Ошибка обработки уведомления', e);
          } finally {
            await api.deleteNotification(notification.receiptId);
          }
        } catch (e) {
          if (signal.aborted || isAbort(e)) break;

          if (e instanceof GreenApiError && (e.status === 401 || e.status === 403)) {
            setStatus('error');
            setLastError(e.userMessage);
            onFatalRef.current?.(e);
            return;
          }

          backoff = backoff ? Math.min(backoff * 2, BACKOFF_MAX_MS) : BACKOFF_START_MS;
          setStatus('error');
          setLastError(
            `${e instanceof GreenApiError ? e.userMessage : 'Ошибка получения сообщений'} ` +
              `Повтор через ${Math.round(backoff / 1000)} с.`,
          );
          await sleep(backoff, signal);
        }
      }
    }

    void loop(client);
    return () => {
      controller.abort();
      setStatus('stopped');
    };
  }, [client]);

  return { status, lastError };
}
