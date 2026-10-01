import { useCallback, useEffect, useReducer } from 'react';
import { GreenApiError, type GreenApiClient } from '../api/greenApi';
import type { ChatEvent, Message, Result } from '../api/types';
import { chatReducer, initialChatState, type ChatState } from '../lib/chatState';
import { formatRecipient, parseRecipient } from '../lib/phone';

function storageKey(idInstance: string) {
  return `tg-green-chat:chats:${idInstance}`;
}

function loadState(idInstance: string | null): ChatState {
  if (!idInstance) return initialChatState;
  try {
    const raw = sessionStorage.getItem(storageKey(idInstance));
    return raw ? { ...initialChatState, ...(JSON.parse(raw) as ChatState) } : initialChatState;
  } catch {
    return initialChatState;
  }
}

function newLocalId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function errorText(e: unknown, fallback: string): string {
  return e instanceof GreenApiError ? e.userMessage : fallback;
}

export function useChats(client: GreenApiClient | null, idInstance: string | null) {
  const [state, dispatch] = useReducer(chatReducer, idInstance, loadState);

  useEffect(() => {
    if (!idInstance) return;
    try {
      sessionStorage.setItem(storageKey(idInstance), JSON.stringify(state));
    } catch {}
  }, [state, idInstance]);

  const openChat = useCallback(
    async (input: string): Promise<Result<string>> => {
      if (!client) return { ok: false, error: 'Нет подключения' };
      const parsed = parseRecipient(input);
      if (!parsed.ok) return parsed;

      const recipient = parsed.value;
      try {
        const account = await client.checkAccount(recipient);
        if (!account.exist || !account.chatId) {
          return {
            ok: false,
            error:
              recipient.kind === 'phone'
                ? 'Аккаунт Telegram не найден. Возможно, поиск по номеру закрыт настройками приватности — попробуйте @username.'
                : 'Пользователь с таким username не найден.',
          };
        }
        const label = formatRecipient(recipient);
        dispatch({
          type: 'chatOpened',
          chat: {
            chatId: account.chatId,
            title: account.username || label,
            subtitle: recipient.kind === 'phone' ? label : account.username || label,
          },
        });
        return { ok: true, value: account.chatId };
      } catch (e) {
        return { ok: false, error: errorText(e, 'Не удалось проверить аккаунт') };
      }
    },
    [client],
  );

  const selectChat = useCallback((chatId: string | null) => {
    dispatch({ type: 'chatSelected', chatId });
  }, []);

  const sendMessage = useCallback(
    async (chatId: string, text: string) => {
      const trimmed = text.trim();
      if (!client || !trimmed) return;

      const message: Message = {
        localId: newLocalId(),
        chatId,
        direction: 'out',
        text: trimmed,
        timestamp: Date.now(),
        status: 'pending',
      };
      dispatch({ type: 'messageQueued', message });

      try {
        const { idMessage } = await client.sendMessage(chatId, trimmed);
        dispatch({ type: 'messageSent', chatId, localId: message.localId, idMessage });
      } catch (e) {
        dispatch({
          type: 'messageFailed',
          chatId,
          localId: message.localId,
          error: errorText(e, 'Не удалось отправить сообщение'),
        });
      }
    },
    [client],
  );

  const handleEvent = useCallback((event: ChatEvent) => {
    dispatch({ type: 'event', event });
  }, []);

  return { ...state, openChat, selectChat, sendMessage, handleEvent };
}
