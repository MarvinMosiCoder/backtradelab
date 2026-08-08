import React from 'react';

export default function AvatarBadge({ avatar, sizeClassName = 'text-4xl' }) {
    return <div className={`flex h-full w-full items-center justify-center bg-gradient-to-br ${avatar.gradient}`}>
        <span className={sizeClassName}>{avatar.emoji}</span>
    </div>;
}
