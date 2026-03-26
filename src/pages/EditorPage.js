import React, {useEffect, useMemo, useRef, useState} from 'react';
import toast from 'react-hot-toast';
import Editor from '../components/Editor';
import ChatSidebar from '../components/ChatSidebar';
import ACTIONS from '../actions/Actions';
import {initSocket} from '../socket';
import {useLocation, useNavigate, Navigate, useParams} from 'react-router-dom';

const THEME_STORAGE_KEY = 'codesync_theme';
const USERNAME_STORAGE_KEY = 'codesync_username';

const getInitialTheme = () => {
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    if (saved === 'light' || saved === 'dark') return saved;
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches
        ? 'light'
        : 'dark';
  } catch {
    return 'dark';
  }
};

const EditorPage = () => {
  const location = useLocation();
  const {roomId} = useParams();
  const navigate = useNavigate();

  const usernameFromState = location.state?.username;
  const createIfNotExists = location.state?.createIfNotExists === true;

  const [themeMode, setThemeMode] = useState(getInitialTheme);
  const [editorLanguage, setEditorLanguage] = useState('javascript');
  const [initialCode, setInitialCode] = useState('');

  const [clients, setClients] = useState([]);
  const [messages, setMessages] = useState([]);

  const [isConnecting, setIsConnecting] = useState(true);
  const [connectionError, setConnectionError] = useState('');
  const [isOnline, setIsOnline] = useState(true);
  const [isSending, setIsSending] = useState(false);

  const [socket, setSocket] = useState(null);
  const socketRef = useRef(null);
  const currentUsername = useMemo(() => {
    return (typeof usernameFromState === 'string' && usernameFromState.trim()) || localStorage.getItem(USERNAME_STORAGE_KEY) || '';
  }, [usernameFromState]);

  useEffect(() => {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, themeMode);
      document.documentElement.dataset.theme = themeMode;
    } catch {
      // ignore
    }
  }, [themeMode]);

  useEffect(() => {
    // Keep username available across refreshes.
    if (typeof usernameFromState === 'string' && usernameFromState.trim()) {
      try {
        localStorage.setItem(USERNAME_STORAGE_KEY, usernameFromState.trim());
      } catch {
        // ignore
      }
    }
  }, [usernameFromState]);

  useEffect(() => {
    if (!roomId) return;

    if (!currentUsername) {
      setIsConnecting(false);
      setConnectionError('Username is required. Please go back and enter your name.');
      return;
    }

    const username = currentUsername;
    let socket = null;
    let mounted = true;

    const cleanup = () => {
      if (!socket) return;
      socket.off(ACTIONS.JOINED);
      socket.off(ACTIONS.DISCONNECTED);
      socket.off(ACTIONS.USERS_UPDATE);
      socket.off(ACTIONS.ROOM_ERROR);
      socket.off(ACTIONS.CHAT_MESSAGE);
      socket.off(ACTIONS.CHAT_HISTORY);
      socket.off(ACTIONS.LANGUAGE_CHANGE);
      socket.off('connect_error');
      socket.off('connect_failed');
      socket.off('disconnect');
      socket.disconnect();
      setSocket(null);
    };

    const handleSocketError = (e) => {
      console.log('socket error', e);
      if (!mounted) return;
      setConnectionError('Network connection failed. Please try again.');
      setIsConnecting(false);
      setIsOnline(false);
    };

    const start = async () => {
      setIsConnecting(true);
      setConnectionError('');
      try {
        socket = await initSocket();
        socketRef.current = socket;
        setSocket(socket);
        socket.on('connect_error', handleSocketError);
        socket.on('connect_failed', handleSocketError);
        socket.on('disconnect', () => {
          if (!mounted) return;
          setIsOnline(false);
          toast.error('Disconnected. Reconnecting…');
        });
        socket.on('connect', () => {
          if (!mounted) return;
          setIsOnline(true);
        });

        socket.on(ACTIONS.ROOM_ERROR, ({message} = {}) => {
          if (!mounted) return;
          setConnectionError(message || 'Invalid Room ID.');
          setIsConnecting(false);
          try {
            socket.disconnect();
          } catch {
            // ignore
          }
        });

        socket.on(ACTIONS.JOINED, ({clients: joinedClients, room} = {}) => {
          if (!mounted) return;
          setClients(joinedClients || []);
          setIsConnecting(false);
          const nextLang = room?.language || 'javascript';
          const nextCode = typeof room?.code === 'string' ? room.code : '';
          setEditorLanguage(nextLang);
          setInitialCode(nextCode);
        });

        socket.on(ACTIONS.USERS_UPDATE, ({clients: nextClients} = {}) => {
          if (!mounted) return;
          setClients(nextClients || []);
        });

        socket.on(ACTIONS.DISCONNECTED, ({socketId} = {}) => {
          if (!mounted) return;
          setClients((prev) => prev.filter((c) => c.socketId !== socketId));
        });

        socket.on(ACTIONS.CHAT_HISTORY, ({messages: hist} = {}) => {
          if (!mounted) return;
          setMessages(Array.isArray(hist) ? hist : []);
        });

        socket.on(ACTIONS.CHAT_MESSAGE, (msg) => {
          if (!mounted) return;
          setMessages((prev) => {
            // Avoid duplicates by id.
            if (prev.some((m) => m.id === msg.id)) return prev;
            return [...prev, msg];
          });
        });

        socket.on(ACTIONS.LANGUAGE_CHANGE, ({language: nextLanguage} = {}) => {
          if (!mounted) return;
          if (typeof nextLanguage === 'string' && nextLanguage.trim()) {
            setEditorLanguage(nextLanguage);
          }
        });

        socket.emit(ACTIONS.JOIN, {
          roomId,
          username,
          createIfNotExists,
        });
      } catch (e) {
        handleSocketError(e);
      }
    };

    start();
    return () => {
      mounted = false;
      cleanup();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, currentUsername, createIfNotExists]);

  const copyRoomId = async () => {
    try {
      await navigator.clipboard.writeText(roomId);
      toast.success('Room ID copied');
    } catch {
      toast.error('Could not copy the Room ID');
    }
  };

  const leaveRoom = () => {
    try {
      socketRef.current?.disconnect();
    } catch {
      // ignore
    }
    navigate('/');
  };

  const languageOptions = useMemo(
      () => [
          {value: 'javascript', label: 'JavaScript'},
          {value: 'python', label: 'Python'},
          {value: 'cpp', label: 'C++'},
      ],
      []
  );

  const onChangeLanguage = (next) => {
    setEditorLanguage(next);
    socket?.emit(ACTIONS.LANGUAGE_CHANGE, {roomId, language: next});
  };

  const onSendMessage = (text) => {
    if (!socket) return;
    setIsSending(true);
    try {
      socket.emit(ACTIONS.CHAT_MESSAGE, {roomId, text});
    } catch (e) {
      toast.error('Failed to send message');
    } finally {
      setTimeout(() => setIsSending(false), 250);
    }
  };

  if (!roomId) return <Navigate to="/" />;

  if (isConnecting) {
    return (
        <div className="cs-page">
          <div className="cs-loadingShell">
            <div className="cs-spinner" />
            <div className="cs-loadingText">Joining CodeSync room…</div>
          </div>
        </div>
    );
  }

  if (connectionError) {
    return (
        <div className="cs-page">
          <div className="cs-errorCard">
            <div className="cs-errorTitle">Couldn’t join this room</div>
            <div className="cs-errorText">{connectionError}</div>
            <div className="cs-errorActions">
              <button className="cs-btn cs-btnPrimary" onClick={() => navigate('/')}>
                Go to Home
              </button>
            </div>
          </div>
        </div>
    );
  }

  return (
      <div className="cs-page">
        <header className="cs-topbar">
          <div className="cs-brand">
            <div className="cs-logoMark">CS</div>
            <div>
              <div className="cs-title">CodeSync</div>
              <div className="cs-tagline">Collaborate and code together in real time</div>
            </div>
          </div>

          <div className="cs-topbarControls">
            <div className="cs-control">
              <label className="cs-label">Language</label>
              <select className="cs-select" value={editorLanguage} onChange={(e) => onChangeLanguage(e.target.value)}>
                {languageOptions.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                ))}
              </select>
            </div>

            <div className="cs-control">
              <label className="cs-label">Theme</label>
              <button className="cs-btn cs-btnSecondary" onClick={() => setThemeMode((t) => (t === 'dark' ? 'light' : 'dark'))}>
                {themeMode === 'dark' ? 'Light mode' : 'Dark mode'}
              </button>
            </div>

            <div className="cs-control cs-roomControl">
              <button className="cs-btn cs-btnTertiary" onClick={copyRoomId}>
                Copy Room ID
              </button>
              <button className="cs-btn cs-btnDanger" onClick={leaveRoom}>
                Leave
              </button>
            </div>
          </div>
        </header>

        {!isOnline ? <div className="cs-networkBanner">Disconnected. Reconnecting…</div> : null}

        <div className="cs-layout">
          <main className="cs-editorArea">
            <Editor
                socket={socket}
                socketRef={socketRef}
                roomId={roomId}
                language={editorLanguage}
                theme={themeMode}
                initialCode={initialCode}
                onCodeChange={() => {}}
            />
          </main>
          <ChatSidebar
              roomId={roomId}
              currentUsername={currentUsername}
              clients={clients}
              messages={messages}
              onSendMessage={onSendMessage}
              isSending={isSending}
          />
        </div>
      </div>
  );
};

export default EditorPage;
