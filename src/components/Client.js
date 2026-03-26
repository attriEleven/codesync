import React from 'react';
import Avatar from 'react-avatar';

const Client = ({username, isSelf = false}) => {
    return (
        <div className={`cs-user ${isSelf ? 'cs-userSelf' : ''}`}>
            <Avatar name={username} size={28} round="14px" />
            <span className="cs-userName">{username}</span>
        </div>
    );
};

export default Client;