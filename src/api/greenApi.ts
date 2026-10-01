import type {
  CheckAccountResponse,
  Credentials,
  DeleteNotificationResponse,
  GetStateInstanceResponse,
  ReceiveNotificationResponse,
  Recipient,
  SendMessageResponse,
} from './types';

export class GreenApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'GreenApiError';
    this.status = status;
  }

  get userMessage(): string {
    switch (this.status) {
      case 0:
        return 'Нет связи с сервером GREEN-API. Проверьте apiUrl и интернет.';
      case 400:
        return 'Некорректный запрос.';
      case 401:
      case 403:
        return 'Неверный idInstance или apiTokenInstance.';
      case 404:
        return 'Метод или инстанс не найден. Проверьте apiUrl и idInstance.';
      case 429:
        return 'Слишком много запросов, попробуйте чуть позже.';
      case 466:
        return 'Лимит тарифа: на бесплатном тарифе доступно не более 3 чатов.';
      default:
        return this.status >= 500
          ? `Сервер GREEN-API недоступен (${this.status}).`
          : `Ошибка GREEN-API (${this.status}).`;
    }
  }
}

type HttpMethod = 'GET' | 'POST' | 'DELETE';

interface RequestOptions {
  body?: unknown;
  pathSuffix?: string;
  query?: Record<string, string | number>;
  signal?: AbortSignal;
}

export class GreenApiClient {
  private readonly base: string;
  private readonly token: string;

  constructor(creds: Credentials) {
    const apiUrl = creds.apiUrl.trim().replace(/\/+$/, '');
    this.base = `${apiUrl}/waInstance${creds.idInstance.trim()}`;
    this.token = creds.apiTokenInstance.trim();
  }

  getStateInstance(signal?: AbortSignal) {
    return this.request<GetStateInstanceResponse>('GET', 'getStateInstance', { signal });
  }

  checkAccount(recipient: Recipient) {
    const body =
      recipient.kind === 'phone'
        ? { phoneNumber: recipient.phoneNumber }
        : { username: recipient.username };
    return this.request<CheckAccountResponse>('POST', 'checkAccount', { body });
  }

  sendMessage(chatId: string, message: string) {
    return this.request<SendMessageResponse>('POST', 'sendMessage', {
      body: { chatId, message },
    });
  }

  receiveNotification(receiveTimeout = 5, signal?: AbortSignal) {
    return this.request<ReceiveNotificationResponse | null>('GET', 'receiveNotification', {
      query: { receiveTimeout },
      signal,
    });
  }

  deleteNotification(receiptId: number) {
    return this.request<DeleteNotificationResponse>('DELETE', 'deleteNotification', {
      pathSuffix: String(receiptId),
    });
  }

  private async request<T>(
    httpMethod: HttpMethod,
    method: string,
    { body, pathSuffix, query, signal }: RequestOptions = {},
  ): Promise<T> {
    let url = `${this.base}/${method}/${this.token}`;
    if (pathSuffix) url += `/${encodeURIComponent(pathSuffix)}`;
    if (query) {
      const params = new URLSearchParams(
        Object.entries(query).map(([k, v]) => [k, String(v)]),
      );
      url += `?${params}`;
    }

    let response: Response;
    try {
      response = await fetch(url, {
        method: httpMethod,
        headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal,
      });
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') throw e;
      throw new GreenApiError(0, e instanceof Error ? e.message : 'Network error');
    }

    const text = await response.text();
    if (!response.ok) {
      throw new GreenApiError(response.status, text || response.statusText);
    }
    try {
      return (text ? JSON.parse(text) : null) as T;
    } catch {
      throw new GreenApiError(response.status, 'Некорректный JSON в ответе');
    }
  }
}
