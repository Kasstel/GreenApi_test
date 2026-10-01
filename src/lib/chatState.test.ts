import { describe, expect, it } from 'vitest';
import type { Message } from '../api/types';
import { chatReducer, initialChatState, type ChatState } from './chatState';

const CHAT = '10000000';

function withChat(): ChatState {
  return chatReducer(initialChatState, {
    type: 'chatOpened',
    chat: { chatId: CHAT, title: '@vasilisa', subtitle: '@vasilisa' },
  });
}

const optimistic: Message = {
  localId: 'local-1',
  chatId: CHAT,
  direction: 'out',
  text: 'Привет',
  timestamp: 1,
  status: 'pending',
};

describe('chatReducer', () => {
  it('открывает чат и делает его активным', () => {
    const state = withChat();
    expect(state.chats).toHaveLength(1);
    expect(state.activeChatId).toBe(CHAT);
  });

  it('повторное открытие не создаёт дубль чата', () => {
    const state = chatReducer(withChat(), {
      type: 'chatOpened',
      chat: { chatId: CHAT, title: 'другое' },
    });
    expect(state.chats).toHaveLength(1);
  });

  it('оптимистичная отправка + эхо = одно сообщение (дедуп по idMessage)', () => {
    let state = chatReducer(withChat(), { type: 'messageQueued', message: optimistic });
    state = chatReducer(state, {
      type: 'messageSent',
      chatId: CHAT,
      localId: 'local-1',
      idMessage: 'id-1',
    });
    state = chatReducer(state, {
      type: 'event',
      event: { kind: 'outgoingEcho', chatId: CHAT, idMessage: 'id-1', text: 'Привет', timestamp: 2 },
    });
    expect(state.messages[CHAT]).toHaveLength(1);
    expect(state.messages[CHAT]![0]).toMatchObject({ idMessage: 'id-1', status: 'sent' });
  });

  it('эхо раньше ответа sendMessage — пузыри склеиваются', () => {
    let state = chatReducer(withChat(), { type: 'messageQueued', message: optimistic });
    state = chatReducer(state, {
      type: 'event',
      event: { kind: 'outgoingEcho', chatId: CHAT, idMessage: 'id-1', text: 'Привет', timestamp: 2 },
    });
    state = chatReducer(state, {
      type: 'event',
      event: { kind: 'status', chatId: CHAT, idMessage: 'id-1', status: 'delivered' },
    });
    expect(state.messages[CHAT]).toHaveLength(2);

    state = chatReducer(state, {
      type: 'messageSent',
      chatId: CHAT,
      localId: 'local-1',
      idMessage: 'id-1',
    });
    expect(state.messages[CHAT]).toHaveLength(1);
    expect(state.messages[CHAT]![0]).toMatchObject({ localId: 'local-1', status: 'delivered' });
  });

  it('статусы только растут, failed/noAccount применяются всегда', () => {
    let state = chatReducer(withChat(), {
      type: 'messageQueued',
      message: { ...optimistic, idMessage: 'id-1', status: 'sent' },
    });
    const status = (s: 'delivered' | 'read' | 'noAccount') =>
      (state = chatReducer(state, {
        type: 'event',
        event: { kind: 'status', chatId: CHAT, idMessage: 'id-1', status: s },
      }));

    status('read');
    status('delivered');
    expect(state.messages[CHAT]![0]!.status).toBe('read');

    status('noAccount');
    expect(state.messages[CHAT]![0]).toMatchObject({ status: 'noAccount' });
    expect(state.messages[CHAT]![0]!.error).toBeTruthy();
  });

  it('messageFailed помечает пузырь ошибкой', () => {
    let state = chatReducer(withChat(), { type: 'messageQueued', message: optimistic });
    state = chatReducer(state, {
      type: 'messageFailed',
      chatId: CHAT,
      localId: 'local-1',
      error: 'Лимит',
    });
    expect(state.messages[CHAT]![0]).toMatchObject({ status: 'failed', error: 'Лимит' });
  });

  it('входящее в неактивный/новый чат создаёт чат и счётчик непрочитанных', () => {
    const incoming = {
      kind: 'incoming' as const,
      chatId: '555',
      idMessage: 'in-1',
      text: 'Ответ',
      timestamp: 3,
      senderName: 'Кощей',
    };
    let state = chatReducer(withChat(), { type: 'event', event: incoming });
    expect(state.chats[0]).toMatchObject({ chatId: '555', title: 'Кощей', unread: 1 });

    state = chatReducer(state, { type: 'event', event: incoming });
    expect(state.messages['555']).toHaveLength(1);
    expect(state.chats[0]!.unread).toBe(1);

    state = chatReducer(state, { type: 'chatSelected', chatId: '555' });
    expect(state.chats[0]!.unread).toBe(0);
  });

  it('входящее в активный чат не увеличивает unread', () => {
    const state = chatReducer(withChat(), {
      type: 'event',
      event: { kind: 'incoming', chatId: CHAT, idMessage: 'in-1', text: 'Ответ', timestamp: 3 },
    });
    expect(state.chats[0]!.unread).toBe(0);
    expect(state.messages[CHAT]).toHaveLength(1);
  });

  it('статус для неизвестного сообщения игнорируется', () => {
    const before = withChat();
    const after = chatReducer(before, {
      type: 'event',
      event: { kind: 'status', chatId: CHAT, idMessage: 'nope', status: 'read' },
    });
    expect(after).toBe(before);
  });
});
