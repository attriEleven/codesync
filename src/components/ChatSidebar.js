import React, {useEffect, useMemo, useRef, useState} from 'react';
import toast from 'react-hot-toast';
import Client from './Client';

const ChatSidebar = ({
    roomId,
    currentUsername,
    clients,
    messages,
    onSendMessage,
    isSending,
}) => {
    const [draft, setDraft] = useState('');
    const listRef = useRef(null);

    useEffect(() => {
        // Auto-scroll to latest message.
        const el = listRef.current;
        if (!el) return;
        el.scrollTop = el.scrollHeight;
    }, [messages.length]);

    const onSubmit = (e) => {
        e.preventDefault();
        const text = draft.trim();
        if (!text) {
            toast.error('Message cannot be empty');
            return;
        }
        onSendMessage(text);
        setDraft('');
    };

    const headerRoom = useMemo(() => {
        if (!roomId) return '';
        return `Room: ${roomId}`;
    }, [roomId]);

    return (
        <aside className="cs-chatSidebar" aria-label="Chat sidebar">
            <div className="cs-sidebarTop">
                <div className="cs-sidebarBrand">
                    <div className="cs-pill">Chat</div>
                    <div className="cs-roomId" title={roomId}>
                        {headerRoom}
                    </div>
                </div>

                <div className="cs-section">
                    <div className="cs-sectionTitle">Active users</div>
                    <div className="cs-usersList">
                        {clients.map((c) => (
                            <Client
                                key={c.socketId}
                                username={c.username}
                                isSelf={c.username === currentUsername}
                            />
                        ))}
                        {clients.length === 0 ? (
                            <div className="cs-muted">No other users yet.</div>
                        ) : null}
                    </div>
                </div>
            </div>

            <div className="cs-chatArea">
                <div className="cs-messages" ref={listRef} role="log" aria-live="polite">
                    {messages.length === 0 ? (
                        <div className="cs-muted cs-emptyChat">
                            No messages yet. Say hi 👋
                        </div>
                    ) : (
                        messages.map((m) => (
                            <div key={m.id} className="cs-message">
                                <div className="cs-messageHeader">
                                    <span className="cs-messageUser">{m.username}</span>
                                    <span className="cs-messageTime">
                                        {m.ts ? new Date(m.ts).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'}) : ''}
                                    </span>
                                </div>
                                <div className="cs-messageText">{m.text}</div>
                            </div>
                        ))
                    )}
                </div>

                <form className="cs-chatForm" onSubmit={onSubmit}>
                    <input
                        className="cs-input"
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        placeholder="Type a message…"
                        disabled={isSending}
                    />
                    <button className="cs-btn cs-btnPrimary" type="submit" disabled={isSending}>
                        {isSending ? 'Sending…' : 'Send'}
                    </button>
                </form>
            </div>
        </aside>
    );
};

export default ChatSidebar;

