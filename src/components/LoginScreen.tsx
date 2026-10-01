import { useState, type FormEvent } from 'react';
import type { Credentials } from '../api/types';

interface Props {
  checking: boolean;
  error: string | null;
  onSubmit: (credentials: Credentials) => void;
}

export function LoginScreen({ checking, error, onSubmit }: Props) {
  const [apiUrl, setApiUrl] = useState('https://api.green-api.com');
  const [idInstance, setIdInstance] = useState('');
  const [apiTokenInstance, setApiTokenInstance] = useState('');
  const [showToken, setShowToken] = useState(false);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    onSubmit({ apiUrl, idInstance, apiTokenInstance });
  }

  return (
    <div className="login">
      <form className="login__card" onSubmit={handleSubmit}>
        <div className="login__logo" aria-hidden>
          <svg viewBox="0 0 32 32" width="72" height="72">
            <circle cx="16" cy="16" r="16" fill="var(--accent)" />
            <path
              d="M7 15.5l16-6.2c.8-.3 1.4.2 1.2 1.4l-2.7 12.8c-.2.9-.8 1.1-1.5.7l-4.2-3.1-2 1.9c-.2.2-.4.4-.9.4l.3-4.3 7.8-7c.3-.3-.1-.5-.5-.2l-9.6 6-4.1-1.3c-.9-.3-.9-.9.2-1.3z"
              fill="#fff"
            />
          </svg>
        </div>
        <h1 className="login__title">Вход в GREEN-API</h1>
        <p className="login__hint">
          Данные инстанса Telegram из{' '}
          <a href="https://console.green-api.com" target="_blank" rel="noreferrer">
            личного кабинета
          </a>
          . Инстанс должен быть авторизован.
        </p>

        <label className="field">
          <span className="field__label">apiUrl</span>
          <input
            className="field__input"
            value={apiUrl}
            onChange={(e) => setApiUrl(e.target.value)}
            placeholder="https://api.green-api.com"
            autoComplete="url"
            inputMode="url"
            required
          />
        </label>

        <label className="field">
          <span className="field__label">idInstance</span>
          <input
            className="field__input"
            value={idInstance}
            onChange={(e) => setIdInstance(e.target.value)}
            placeholder="1101000001"
            inputMode="numeric"
            autoComplete="username"
            required
            autoFocus
          />
        </label>

        <label className="field">
          <span className="field__label">apiTokenInstance</span>
          <div className="field__row">
            <input
              className="field__input"
              type={showToken ? 'text' : 'password'}
              value={apiTokenInstance}
              onChange={(e) => setApiTokenInstance(e.target.value)}
              placeholder="d75b3a66374942c5b3c019c698..."
              autoComplete="current-password"
              required
            />
            <button
              type="button"
              className="field__toggle"
              onClick={() => setShowToken((v) => !v)}
              aria-label={showToken ? 'Скрыть токен' : 'Показать токен'}
            >
              {showToken ? 'Скрыть' : 'Показать'}
            </button>
          </div>
        </label>

        {error && (
          <p className="login__error" role="alert">
            {error}
          </p>
        )}

        <button className="button" type="submit" disabled={checking}>
          {checking ? 'Проверяем…' : 'Войти'}
        </button>

        <p className="login__note">
          Токен хранится только в этой вкладке (sessionStorage) и отправляется напрямую в GREEN-API.
        </p>
      </form>
    </div>
  );
}
