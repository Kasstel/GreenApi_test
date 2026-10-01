import { Fragment, useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent } from 'react';
import type { Chat, Message, MessageStatus } from '../api/types';
import { formatDay, formatTime } from '../lib/format';
import { Avatar } from './Avatar';

interface Props {
  chat: Chat | null;
  messages: Message[];
  onSend: (text: string) => void;
  onBack: () => void;
}

export function ChatWindow({ chat, messages, onSend, onBack }: Props) {
  if (!chat) {
    return (
      <main className="chat chat--empty">
        <p className="chat__placeholder">Выберите чат или начните новый</p>
      </main>
    );
  }

  return (
    <main className="chat">
      <header className="chat__header">
        <button className="icon-button chat__back" type="button" onClick={onBack} aria-label="Назад">
          <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden>
            <path fill="currentColor" d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20z" />
          </svg>
        </button>
        <Avatar title={chat.title} seed={chat.chatId} size={42} />
        <div className="chat__meta">
          <span className="chat__title">{chat.title}</span>
          {chat.subtitle && chat.subtitle !== chat.title && (
            <span className="chat__subtitle">{chat.subtitle}</span>
          )}
        </div>
      </header>
      <MessageList messages={messages} />
      <MessageInput key={chat.chatId} onSend={onSend} />
    </main>
  );
}

function MessageList({ messages }: { messages: Message[] }) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' });
  }, [messages.length]);

  if (messages.length === 0) {
    return (
      <div className="messages messages--empty">
        <p className="messages__hint">Сообщений пока нет. Напишите первым!</p>
      </div>
    );
  }

  return (
    <div className="messages" role="log" aria-live="polite">
      <div className="messages__inner">
        {messages.map((message, i) => {
          const day = formatDay(message.timestamp);
          const prev = messages[i - 1];
          const showDay = !prev || formatDay(prev.timestamp) !== day;
          return (
            <Fragment key={message.localId}>
              {showDay && <div className="messages__day">{day}</div>}
              <Bubble message={message} />
            </Fragment>
          );
        })}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}

function Bubble({ message }: { message: Message }) {
  const out = message.direction === 'out';
  const failed = message.status === 'failed' || message.status === 'noAccount';
  return (
    <div className={`bubble-row bubble-row--${out ? 'out' : 'in'}`}>
      <div className={`bubble bubble--${out ? 'out' : 'in'}${failed ? ' bubble--failed' : ''}`}>
        <span className="bubble__text">{message.text}</span>
        <span className="bubble__meta">
          {formatTime(message.timestamp)}
          {out && message.status && <StatusIcon status={message.status} />}
        </span>
      </div>
      {message.error && <div className="bubble__error">{message.error}</div>}
    </div>
  );
}

const STATUS_TITLE: Record<MessageStatus, string> = {
  pending: 'Отправляется',
  sent: 'Отправлено',
  delivered: 'Доставлено',
  read: 'Прочитано',
  failed: 'Ошибка отправки',
  noAccount: 'Нет аккаунта Telegram',
};

function StatusIcon({ status }: { status: MessageStatus }) {
  const title = STATUS_TITLE[status];
  if (status === 'failed' || status === 'noAccount') {
    return (
      <span className="status status--failed" title={title} aria-label={title}>
        !
      </span>
    );
  }
  if (status === 'pending') {
    return (
      <svg className="status" viewBox="0 0 16 16" width="15" height="15" aria-label={title}>
        <title>{title}</title>
        <circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" strokeWidth="1.4" />
        <path d="M8 4.5V8l2.2 1.6" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      </svg>
    );
  }
  const double = status !== 'sent';
  return (
    <svg
      className={`status status--${status}`}
      viewBox="0 0 18 12"
      width="18"
      height="12"
      aria-label={title}
    >
      <title>{title}</title>
      <path d="M1 6.5l3.5 3.5L11 3" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      {double && (
        <path d="M7.5 10L14 3" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      )}
    </svg>
  );
}

function MessageInput({ onSend }: { onSend: (text: string) => void }) {
  const [text, setText] = useState('');
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    ref.current?.focus();
  }, []);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [text]);

  function send() {
    if (!text.trim()) return;
    onSend(text);
    setText('');
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      send();
    }
  }

  return (
    <form
      className="composer"
      onSubmit={(e) => {
        e.preventDefault();
        send();
      }}
    >
      <textarea
        ref={ref}
        className="composer__input"
        rows={1}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Сообщение"
        aria-label="Сообщение"
      />
      <button className="composer__send" type="submit" disabled={!text.trim()} aria-label="Отправить">
        <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden>
          <path fill="currentColor" d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
        </svg>
      </button>
    </form>
  );
}
