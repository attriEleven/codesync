import {io} from 'socket.io-client';

export const initSocket = async () => {
    const options = {
        'force new connection': true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 500,
        timeout: 10000,
        transports: ['websocket'],
    };
    const url =
        process.env.REACT_APP_BACKEND_URL ||
        'http://localhost:5000';
    return io(url, options);
};