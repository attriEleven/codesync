import React, {useEffect, useImperativeHandle, useRef, useState} from 'react';
import MonacoEditor from '@monaco-editor/react';
import ACTIONS from '../actions/Actions';

const Editor = React.forwardRef(
    ({socket, socketRef, roomId, onCodeChange, language, theme, initialCode = ''}, ref) => {
        const [code, setCode] = useState(initialCode);
        const isApplyingRemote = useRef(false);
        const activeSocket = socket || socketRef?.current || null;

        useEffect(() => {
            // If the initial code changes after mount (e.g., on JOINED), apply it once.
            if (typeof initialCode !== 'string') return;
            if (initialCode === code) return;
            isApplyingRemote.current = true;
            setCode(initialCode);
            onCodeChange?.(initialCode);
            setTimeout(() => {
                isApplyingRemote.current = false;
            }, 0);
            // eslint-disable-next-line react-hooks/exhaustive-deps
        }, [initialCode]);

        useImperativeHandle(ref, () => ({
            setCode: (nextCode) => {
                isApplyingRemote.current = true;
                setCode(typeof nextCode === 'string' ? nextCode : '');
                // allow Monaco onChange to fire without emitting
                setTimeout(() => {
                    isApplyingRemote.current = false;
                }, 0);
            },
        }));

        useEffect(() => {
            if (!activeSocket) return;

            const onRemoteCode = ({code: remoteCode}) => {
                if (typeof remoteCode !== 'string') return;
                isApplyingRemote.current = true;
                setCode(remoteCode);
                onCodeChange?.(remoteCode);
                setTimeout(() => {
                    isApplyingRemote.current = false;
                }, 0);
            };

            activeSocket.on(ACTIONS.CODE_CHANGE, onRemoteCode);
            return () => {
                activeSocket.off(ACTIONS.CODE_CHANGE, onRemoteCode);
            };
        }, [activeSocket, onCodeChange]);

        return (
            <div className="cs-editor">
                <MonacoEditor
                    height="100%"
                    width="100%"
                    value={code}
                    language={language}
                    theme={theme === 'dark' ? 'vs-dark' : 'vs'}
                    options={{
                        fontFamily: 'Cascadia Code, ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                        fontSize: 14,
                        minimap: {enabled: false},
                        scrollBeyondLastLine: false,
                        wordWrap: 'on',
                        automaticLayout: true,
                    }}
                    onChange={(value) => {
                        const next = typeof value === 'string' ? value : '';
                        setCode(next);
                        onCodeChange(next);
                        if (!isApplyingRemote.current) {
                            activeSocket?.emit(ACTIONS.CODE_CHANGE, {
                                roomId,
                                code: next,
                            });
                        }
                    }}
                />
            </div>
        );
    }
);

export default Editor;
