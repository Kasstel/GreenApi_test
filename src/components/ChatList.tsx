import { useState, type FormEvent } from 'react';
import type { Chat, Message, Result } from '../api/types';
import type { PollingStatus } from '../hooks/usePolling';
import { formatListTime } from '../lib/format';
import { Avatar } from './Avatar';

interface Props {
  idInstance: string;
  chats: Chat[];
  messages: Record<string, Message[]>;
  activeChatId: string | null;
  pollingStatus: PollingStatus;
  pollingError: string | null;
  onSelect: (chatId: string) => void;
  onOpenChat: (input: string) => Promise<Result<string>>;
  onLogout: () => void;
}

const STATUS_LABEL: Record<PollingStatus, string> = {
  online: 'в сети',
  connecting: 'подключение…',
  error: 'нет связи',
  stopped: 'остановлено',
};

export function ChatList({
  idInstance,
  chats,
  messages,
  activeChatId,
  pollingStatus,
  pollingError,
  onSelect,
  onOpenChat,
  onLogout,
}: Props) {
  const [recipient, setRecipient] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    const result = await onOpenChat(recipient);
    setBusy(false);
    if (result.ok) setRecipient('');
    else setError(result.error);
  }

  return (
    <aside className="sidebar">
      <header className="sidebar__header">
        <div className="sidebar__account">
          <span className="sidebar__title">Инстанс {idInstance}</span>
          <span
            className={`sidebar__status sidebar__status--${pollingStatus}`}
            title={pollingError ?? undefined}
          >
            <span className="dot" aria-hidden /> {STATUS_LABEL[pollingStatus]}
          </span>
        </div>
        <button className="icon-button" type="button" onClick={onLogout} title="Выйти">
          <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden>
            <path
              fill="currentColor"
              d="M16 17v-3H9v-4h7V7l5 5-5 5M14 2a2 2 0 0 1 2 2v2h-2V4H5v16h9v-2h2v2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9z"
            />
          </svg>
        </button>
      </header>

      <form className="new-chat" onSubmit={handleSubmit}>
        <input
          className="new-chat__input"
          value={recipient}
          onChange={(e) => {
            setRecipient(e.target.value);
            setError(null);
          }}
          placeholder="Номер телефона или @username"
          aria-label="Новый чат: номер телефона или @username"
          disabled={busy}
        />
        <button className="new-chat__button" type="submit" disabled={busy || !recipient.trim()}>
          {busy ? '…' : 'Написать'}
        </button>
        {error && (
          <p className="new-chat__error" role="alert">
            {error}
          </p>
        )}
      </form>

      {pollingStatus === 'error' && pollingError && (
        <p className="sidebar__banner" role="status">
          {pollingError}
        </p>
      )}

      <ul className="chat-list">
        {chats.length === 0 && (
          <li className="chat-list__empty">
            Чатов пока нет. Введите номер телефона или @username собеседника, чтобы начать.
          </li>
        )}
        {chats.map((chat) => {
          const last = messages[chat.chatId]?.at(-1);
          return (
            <li key={chat.chatId}>
              <button
                type="button"
                className={`chat-item${chat.chatId === activeChatId ? ' chat-item--active' : ''}`}
                onClick={() => onSelect(chat.chatId)}
              >
                <Avatar title={chat.title} seed={chat.chatId} />
                <div className="chat-item__body">
                  <div className="chat-item__row">
                    <span className="chat-item__title">{chat.title}</span>
                    {last && (
                      <span className="chat-item__time">{formatListTime(last.timestamp)}</span>
                    )}
                  </div>
                  <div className="chat-item__row">
                    <span className="chat-item__preview">
                      {last ? (
                        <>
                          {last.direction === 'out' && <span className="chat-item__you">Вы: </span>}
                          {last.text}
                        </>
                      ) : (
                        chat.subtitle
                      )}
                    </span>
                    {chat.unread > 0 && <span className="badge">{chat.unread}</span>}
                  </div>
                </div>
              </button>
            </li>
          );
        })}
      </ul>
    </aside>
  );
}
