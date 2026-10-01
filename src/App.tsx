import type { GreenApiClient } from './api/greenApi';
import { ChatList } from './components/ChatList';
import { ChatWindow } from './components/ChatWindow';
import { LoginScreen } from './components/LoginScreen';
import { useAuth } from './hooks/useAuth';
import { useChats } from './hooks/useChats';
import { usePolling } from './hooks/usePolling';

export default function App() {
  const { credentials, client, checking, error, login, logout } = useAuth();

  if (!credentials || !client) {
    return <LoginScreen checking={checking} error={error} onSubmit={login} />;
  }

  return (
    <Messenger
      key={credentials.idInstance}
      client={client}
      idInstance={credentials.idInstance}
      onLogout={logout}
    />
  );
}

interface MessengerProps {
  client: GreenApiClient;
  idInstance: string;
  onLogout: () => void;
}

function Messenger({ client, idInstance, onLogout }: MessengerProps) {
  const chats = useChats(client, idInstance);
  const polling = usePolling(client, {
    onEvent: chats.handleEvent,
    onFatalError: onLogout,
  });

  const activeChat = chats.chats.find((c) => c.chatId === chats.activeChatId) ?? null;

  return (
    <div className={`app${activeChat ? ' app--chat-open' : ''}`}>
      <ChatList
        idInstance={idInstance}
        chats={chats.chats}
        messages={chats.messages}
        activeChatId={chats.activeChatId}
        pollingStatus={polling.status}
        pollingError={polling.lastError}
        onSelect={chats.selectChat}
        onOpenChat={chats.openChat}
        onLogout={onLogout}
      />
      <ChatWindow
        chat={activeChat}
        messages={activeChat ? (chats.messages[activeChat.chatId] ?? []) : []}
        onSend={(text) => activeChat && void chats.sendMessage(activeChat.chatId, text)}
        onBack={() => chats.selectChat(null)}
      />
    </div>
  );
}
