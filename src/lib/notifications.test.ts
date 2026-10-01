import { describe, expect, it } from 'vitest';
import { parseNotification } from './notifications';

const instanceData = { idInstance: 4100000000, wid: '79876543210@c.us', typeInstance: 'telegram' };

const incoming = {
  typeWebhook: 'incomingMessageReceived',
  instanceData,
  timestamp: 1763115112,
  idMessage: '1763115112345',
  senderData: {
    chatId: '10000000',
    chatType: 'user',
    sender: '10000000',
    chatName: 'Василиса Премудрая',
    senderName: 'Василиса',
  },
  messageData: {
    typeMessage: 'textMessage',
    textMessageData: { textMessage: 'Привет!' },
  },
};

describe('parseNotification', () => {
  it('incomingMessageReceived (textMessage)', () => {
    expect(parseNotification(incoming)).toEqual({
      kind: 'incoming',
      chatId: '10000000',
      idMessage: '1763115112345',
      text: 'Привет!',
      timestamp: 1763115112000,
      senderName: 'Василиса',
    });
  });

  it('incomingMessageReceived (extendedTextMessage)', () => {
    const event = parseNotification({
      ...incoming,
      messageData: {
        typeMessage: 'extendedTextMessage',
        extendedTextMessageData: { text: 'https://green-api.com' },
      },
    });
    expect(event).toMatchObject({ kind: 'incoming', text: 'https://green-api.com' });
  });

  it('incomingMessageReceived с нетекстовым типом -> заглушка', () => {
    const event = parseNotification({
      ...incoming,
      messageData: { typeMessage: 'imageMessage' },
    });
    expect(event).toMatchObject({ kind: 'incoming' });
    expect(event.kind === 'incoming' && event.text).toContain('imageMessage');
  });

  it('outgoingAPIMessageReceived -> outgoingEcho', () => {
    const event = parseNotification({
      ...incoming,
      typeWebhook: 'outgoingAPIMessageReceived',
      idMessage: 'abc',
      messageData: {
        typeMessage: 'extendedTextMessage',
        extendedTextMessageData: { text: 'Моё сообщение' },
      },
    });
    expect(event).toEqual({
      kind: 'outgoingEcho',
      chatId: '10000000',
      idMessage: 'abc',
      text: 'Моё сообщение',
      timestamp: 1763115112000,
      chatName: 'Василиса Премудрая',
    });
  });

  it.each(['sent', 'delivered', 'read', 'failed', 'noAccount'] as const)(
    'outgoingMessageStatus: %s (chatId с верхнего уровня)',
    (status) => {
      expect(
        parseNotification({
          typeWebhook: 'outgoingMessageStatus',
          chatId: '10000000',
          instanceData,
          timestamp: 1755591519,
          idMessage: '115054445839974415',
          status,
        }),
      ).toEqual({ kind: 'status', chatId: '10000000', idMessage: '115054445839974415', status });
    },
  );

  it('outgoingMessageStatus с description', () => {
    expect(
      parseNotification({
        typeWebhook: 'outgoingMessageStatus',
        chatId: '1',
        idMessage: '2',
        status: 'failed',
        description: 'chatId unresolvable on this session',
      }),
    ).toMatchObject({ kind: 'status', description: 'chatId unresolvable on this session' });
  });

  it('неизвестный статус -> ignored', () => {
    expect(
      parseNotification({ typeWebhook: 'outgoingMessageStatus', chatId: '1', idMessage: '2', status: 'weird' }),
    ).toMatchObject({ kind: 'ignored' });
  });

  it('прочие типы -> ignored', () => {
    expect(parseNotification({ typeWebhook: 'stateInstanceChanged', stateInstance: 'authorized' }))
      .toMatchObject({ kind: 'ignored' });
    expect(parseNotification({ ...incoming, typeWebhook: 'outgoingMessageReceived' }))
      .toMatchObject({ kind: 'ignored' });
  });

  it.each([
    ['null', null],
    ['undefined', undefined],
    ['строка', 'garbage'],
    ['число', 42],
    ['массив', [incoming]],
    ['пустой объект', {}],
  ])('мусорное тело (%s) -> ignored, не бросает', (_label, body) => {
    expect(parseNotification(body)).toMatchObject({ kind: 'ignored' });
  });

  it('входящее без chatId / idMessage / messageData -> ignored', () => {
    expect(parseNotification({ ...incoming, senderData: {} })).toMatchObject({ kind: 'ignored' });
    expect(parseNotification({ ...incoming, idMessage: undefined })).toMatchObject({ kind: 'ignored' });
    expect(parseNotification({ ...incoming, messageData: 'oops' })).toMatchObject({ kind: 'ignored' });
    expect(parseNotification({ ...incoming, senderData: null })).toMatchObject({ kind: 'ignored' });
  });
});
