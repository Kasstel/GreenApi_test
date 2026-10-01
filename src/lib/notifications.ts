import type { ChatEvent, DeliveryStatus, RawNotificationBody } from '../api/types';

const DELIVERY_STATUSES: readonly DeliveryStatus[] = [
  'sent',
  'delivered',
  'read',
  'failed',
  'noAccount',
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function nonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

function isDeliveryStatus(value: unknown): value is DeliveryStatus {
  return DELIVERY_STATUSES.includes(value as DeliveryStatus);
}

function toMs(timestamp: unknown): number {
  return typeof timestamp === 'number' && timestamp > 0 ? timestamp * 1000 : Date.now();
}

function extractText(messageData: RawNotificationBody['messageData']): string | null {
  if (!isRecord(messageData)) return null;
  const { typeMessage, textMessageData, extendedTextMessageData } = messageData;

  if (typeMessage === 'textMessage' && nonEmptyString(textMessageData?.textMessage)) {
    return textMessageData.textMessage;
  }
  if (typeMessage === 'extendedTextMessage' && nonEmptyString(extendedTextMessageData?.text)) {
    return extendedTextMessageData.text;
  }
  if (nonEmptyString(typeMessage)) {
    return `[${typeMessage}: этот тип сообщений не поддерживается]`;
  }
  return null;
}

export function parseNotification(raw: unknown): ChatEvent {
  if (!isRecord(raw)) return { kind: 'ignored', reason: 'body is not an object' };
  const body = raw as RawNotificationBody;

  switch (body.typeWebhook) {
    case 'incomingMessageReceived':
    case 'outgoingAPIMessageReceived': {
      const chatId = body.senderData?.chatId;
      const { idMessage } = body;
      const text = extractText(body.messageData);
      if (!nonEmptyString(chatId) || !nonEmptyString(idMessage) || text === null) {
        return { kind: 'ignored', reason: `malformed ${body.typeWebhook}` };
      }
      const timestamp = toMs(body.timestamp);

      return body.typeWebhook === 'incomingMessageReceived'
        ? {
            kind: 'incoming',
            chatId,
            idMessage,
            text,
            timestamp,
            senderName: body.senderData?.senderName || body.senderData?.chatName,
          }
        : {
            kind: 'outgoingEcho',
            chatId,
            idMessage,
            text,
            timestamp,
            chatName: body.senderData?.chatName,
          };
    }

    case 'outgoingMessageStatus': {
      const { chatId, idMessage, status, description } = body;
      if (!nonEmptyString(chatId) || !nonEmptyString(idMessage) || !isDeliveryStatus(status)) {
        return { kind: 'ignored', reason: 'malformed outgoingMessageStatus' };
      }
      return {
        kind: 'status',
        chatId,
        idMessage,
        status,
        ...(nonEmptyString(description) ? { description } : {}),
      };
    }

    default:
      return { kind: 'ignored', reason: `unhandled typeWebhook: ${String(body.typeWebhook)}` };
  }
}
