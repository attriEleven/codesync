import React, {useEffect, useMemo, useState} from 'react';
import {v4 as uuidV4} from 'uuid';
import toast from 'react-hot-toast';
import {useNavigate} from 'react-router-dom';

const THEME_STORAGE_KEY = 'codesync_theme';
const USERNAME_STORAGE_KEY = 'codesync_username';

const getInitialTheme = () => {
    try {
        const saved = localStorage.getItem(THEME_STORAGE_KEY);
        if (saved === 'light' || saved === 'dark') return saved;
        return window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
    } catch {
        return 'dark';
    }
};

const Home = () => {
    const navigate = useNavigate();

    const [joinRoomId, setJoinRoomId] = useState('');
    const [joinUsername, setJoinUsername] = useState('');
    const [createUsername, setCreateUsername] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [themeMode, setThemeMode] = useState(getInitialTheme);

    useEffect(() => {
        try {
            localStorage.setItem(THEME_STORAGE_KEY, themeMode);
            document.documentElement.dataset.theme = themeMode;
        } catch {
            // ignore
        }
    }, [themeMode]);

    const themeButtonLabel = useMemo(() => {
        return themeMode === 'dark' ? 'Light mode' : 'Dark mode';
    }, [themeMode]);

    const createNewRoom = (e) => {
        e.preventDefault();
        const username = createUsername.trim();
        if (!username) {
            toast.error('Username is required to create a room');
            return;
        }
        try {
            localStorage.setItem(USERNAME_STORAGE_KEY, username);
        } catch {
            // ignore
        }
        const roomId = uuidV4();
        setIsLoading(true);
        navigate(`/editor/${roomId}`, {
            state: {username, createIfNotExists: true},
        });
    };

    const joinRoom = () => {
        const roomId = joinRoomId.trim();
        const username = joinUsername.trim();
        if (!roomId || !username) {
            toast.error('Room ID and username are required');
            return;
        }
        try {
            localStorage.setItem(USERNAME_STORAGE_KEY, username);
        } catch {
            // ignore
        }

        setIsLoading(true);
        navigate(`/editor/${roomId}`, {state: {username, createIfNotExists: false}});
    };

    const handleInputEnter = (e) => {
        if (e.code === 'Enter') {
            joinRoom();
        }
    };

    return (
        <div className="cs-home">
            <div className="cs-homeTop">
                <div className="cs-brand cs-brandSm">
                    <div className="cs-logoMark">CS</div>
                    <div>
                        <div className="cs-title">CodeSync</div>
                        <div className="cs-tagline">Collaborate and code together in real time</div>
                    </div>
                </div>

                <button
                    className="cs-btn cs-btnTertiary"
                    onClick={() => setThemeMode((t) => (t === 'dark' ? 'light' : 'dark'))}
                    disabled={isLoading}
                >
                    {themeButtonLabel}
                </button>
            </div>

            <div className="cs-card">
                <div className="cs-homeHeroTitle">CodeSync</div>
                <div className="cs-homeHeroSub">Collaborate and code together in real time</div>

                <div className="cs-section">
                    <div className="cs-sectionTitle">Join a room</div>
                    <div className="cs-grid">
                        <input
                            type="text"
                            className="cs-input"
                            placeholder="Room ID"
                            onChange={(e) => setJoinRoomId(e.target.value)}
                            value={joinRoomId}
                            onKeyUp={handleInputEnter}
                            disabled={isLoading}
                        />
                        <input
                            type="text"
                            className="cs-input"
                            placeholder="Username"
                            onChange={(e) => setJoinUsername(e.target.value)}
                            value={joinUsername}
                            onKeyUp={handleInputEnter}
                            disabled={isLoading}
                        />
                        <button className="cs-btn cs-btnPrimary" onClick={joinRoom} disabled={isLoading}>
                            {isLoading ? 'Joining…' : 'Join room'}
                        </button>
                    </div>
                </div>

                <div className="cs-divider" />

                <div className="cs-section">
                    <div className="cs-sectionTitle">Create a room</div>
                    <div className="cs-grid">
                        <input
                            type="text"
                            className="cs-input"
                            placeholder="Username"
                            onChange={(e) => setCreateUsername(e.target.value)}
                            value={createUsername}
                            disabled={isLoading}
                        />
                        <button className="cs-btn cs-btnSecondary" onClick={createNewRoom} disabled={isLoading}>
                            Create new room
                        </button>
                    </div>
                </div>

                <div className="cs-hint">
                    Tip: open another browser window, join the same Room ID, and start collaborating instantly.
                </div>
            </div>
        </div>
    );
};

export default Home;