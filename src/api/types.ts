export interface Credentials {
  apiUrl: string;
  idInstance: string;
  apiTokenInstance: string;
}

export type Result<T> = { ok: true; value: T } | { ok: false; error: string };

export type Recipient =
  | { kind: 'phone'; phoneNumber: number }
  | { kind: 'username'; username: string };

export type DeliveryStatus = 'sent' | 'delivered' | 'read' | 'failed' | 'noAccount';

export type MessageStatus = 'pending' | DeliveryStatus;

export interface Message {
  localId: string;
  idMessage?: string;
  chatId: string;
  direction: 'in' | 'out';
  text: string;
  timestamp: number;
  status?: MessageStatus;
  error?: string;
}

export interface Chat {
  chatId: string;
  title: string;
  subtitle?: string;
  unread: number;
}

export type ChatEvent =
  | {
      kind: 'incoming';
      chatId: string;
      idMessage: string;
      text: string;
      timestamp: number;
      senderName?: string;
    }
  | {
      kind: 'outgoingEcho';
      chatId: string;
      idMessage: string;
      text: string;
      timestamp: number;
      chatName?: string;
    }
  | {
      kind: 'status';
      chatId: string;
      idMessage: string;
      status: DeliveryStatus;
      description?: string;
    }
  | { kind: 'ignored'; reason: string };

export type StateInstance =
  | 'notAuthorized'
  | 'authorized'
  | 'blocked'
  | 'sleepMode'
  | 'starting'
  | 'yellowCard';

export interface GetStateInstanceResponse {
  stateInstance: StateInstance | string;
}

export interface CheckAccountResponse {
  exist: boolean;
  chatId?: string;
  username?: string;
  phoneNumber?: number;
}

export interface SendMessageResponse {
  idMessage: string;
}

export interface ReceiveNotificationResponse {
  receiptId: number;
  body: unknown;
}

export interface DeleteNotificationResponse {
  result: boolean;
}

export interface RawNotificationBody {
  typeWebhook?: string;
  timestamp?: number;
  idMessage?: string;
  chatId?: string;
  status?: string;
  description?: string;
  senderData?: {
    chatId?: string;
    sender?: string;
    chatName?: string;
    senderName?: string;
  };
  messageData?: {
    typeMessage?: string;
    textMessageData?: { textMessage?: string };
    extendedTextMessageData?: { text?: string };
  };
}
