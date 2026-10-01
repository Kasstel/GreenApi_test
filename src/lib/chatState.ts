import type { Chat, ChatEvent, Message, MessageStatus } from '../api/types';

export interface ChatState {
  chats: Chat[];
  messages: Record<string, Message[]>;
  activeChatId: string | null;
}

export const initialChatState: ChatState = { chats: [], messages: {}, activeChatId: null };

export type ChatAction =
  | { type: 'chatOpened'; chat: Omit<Chat, 'unread'> }
  | { type: 'chatSelected'; chatId: string | null }
  | { type: 'messageQueued'; message: Message }
  | { type: 'messageSent'; chatId: string; localId: string; idMessage: string }
  | { type: 'messageFailed'; chatId: string; localId: string; error: string }
  | { type: 'event'; event: ChatEvent };

const STATUS_RANK: Record<MessageStatus, number> = {
  pending: 0,
  sent: 1,
  delivered: 2,
  read: 3,
  failed: 4,
  noAccount: 4,
};

function nextStatus(current: MessageStatus | undefined, incoming: MessageStatus): MessageStatus {
  if (incoming === 'failed' || incoming === 'noAccount') return incoming;
  if (!current) return incoming;
  return STATUS_RANK[incoming] > STATUS_RANK[current] ? incoming : current;
}

function touchChat(
  chats: Chat[],
  chatId: string,
  fallbackTitle: string | undefined,
  incrementUnread: boolean,
): Chat[] {
  const existing = chats.find((c) => c.chatId === chatId);
  const chat: Chat = existing
    ? {
        ...existing,
        title: existing.title === existing.chatId && fallbackTitle ? fallbackTitle : existing.title,
        unread: existing.unread + (incrementUnread ? 1 : 0),
      }
    : { chatId, title: fallbackTitle || chatId, unread: incrementUnread ? 1 : 0 };
  return [chat, ...chats.filter((c) => c.chatId !== chatId)];
}

function updateMessages(
  state: ChatState,
  chatId: string,
  update: (list: Message[]) => Message[],
): Record<string, Message[]> {
  return { ...state.messages, [chatId]: update(state.messages[chatId] ?? []) };
}

function hasMessage(state: ChatState, chatId: string, idMessage: string): boolean {
  return (state.messages[chatId] ?? []).some((m) => m.idMessage === idMessage);
}

function applyEvent(state: ChatState, event: ChatEvent): ChatState {
  switch (event.kind) {
    case 'incoming': {
      if (hasMessage(state, event.chatId, event.idMessage)) return state;
      const message: Message = {
        localId: `in-${event.idMessage}`,
        idMessage: event.idMessage,
        chatId: event.chatId,
        direction: 'in',
        text: event.text,
        timestamp: event.timestamp,
      };
      return {
        ...state,
        chats: touchChat(
          state.chats,
          event.chatId,
          event.senderName,
          state.activeChatId !== event.chatId,
        ),
        messages: updateMessages(state, event.chatId, (list) => [...list, message]),
      };
    }

    case 'outgoingEcho': {
      if (hasMessage(state, event.chatId, event.idMessage)) return state;
      const message: Message = {
        localId: `echo-${event.idMessage}`,
        idMessage: event.idMessage,
        chatId: event.chatId,
        direction: 'out',
        text: event.text,
        timestamp: event.timestamp,
        status: 'sent',
      };
      return {
        ...state,
        chats: touchChat(state.chats, event.chatId, event.chatName, false),
        messages: updateMessages(state, event.chatId, (list) => [...list, message]),
      };
    }

    case 'status': {
      if (!hasMessage(state, event.chatId, event.idMessage)) return state;
      return {
        ...state,
        messages: updateMessages(state, event.chatId, (list) =>
          list.map((m) =>
            m.idMessage === event.idMessage
              ? {
                  ...m,
                  status: nextStatus(m.status, event.status),
                  error:
                    event.status === 'noAccount'
                      ? 'У получателя нет Telegram или номер скрыт настройками приватности'
                      : event.status === 'failed'
                        ? event.description || 'Не удалось доставить сообщение'
                        : m.error,
                }
              : m,
          ),
        ),
      };
    }

    case 'ignored':
      return state;
  }
}

export function chatReducer(state: ChatState, action: ChatAction): ChatState {
  switch (action.type) {
    case 'chatOpened': {
      const existing = state.chats.find((c) => c.chatId === action.chat.chatId);
      const chats = existing
        ? state.chats.map((c) => (c.chatId === action.chat.chatId ? { ...c, unread: 0 } : c))
        : [{ ...action.chat, unread: 0 }, ...state.chats];
      return { ...state, chats, activeChatId: action.chat.chatId };
    }

    case 'chatSelected':
      return {
        ...state,
        activeChatId: action.chatId,
        chats: state.chats.map((c) => (c.chatId === action.chatId ? { ...c, unread: 0 } : c)),
      };

    case 'messageQueued':
      return {
        ...state,
        chats: touchChat(state.chats, action.message.chatId, undefined, false),
        messages: updateMessages(state, action.message.chatId, (list) => [...list, action.message]),
      };

    case 'messageSent':
      return {
        ...state,
        messages: updateMessages(state, action.chatId, (list) => {
          const echo = list.find(
            (m) => m.idMessage === action.idMessage && m.localId !== action.localId,
          );
          return list
            .filter((m) => m !== echo)
            .map((m) =>
              m.localId === action.localId
                ? {
                    ...m,
                    idMessage: action.idMessage,
                    status: nextStatus(echo?.status ?? m.status, 'sent'),
                  }
                : m,
            );
        }),
      };

    case 'messageFailed':
      return {
        ...state,
        messages: updateMessages(state, action.chatId, (list) =>
          list.map((m) =>
            m.localId === action.localId ? { ...m, status: 'failed', error: action.error } : m,
          ),
        ),
      };

    case 'event':
      return applyEvent(state, action.event);
  }
}
