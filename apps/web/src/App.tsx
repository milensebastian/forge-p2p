import React, { useState, useEffect } from 'react';
import { parseRoomFromUrl, getRandomName, getRandomColor } from '@forge/core';
import { LandingPage } from './components/LandingPage';
import { WorkspaceView } from './components/WorkspaceView';

export const App: React.FC = () => {
  const [roomId, setRoomId] = useState<string | null>(() => {
    return parseRoomFromUrl(window.location.href);
  });

  const [userName, setUserName] = useState<string>(() => {
    return localStorage.getItem('forge_user_name') || getRandomName();
  });

  const [userColor, setUserColor] = useState<string>(() => {
    return localStorage.getItem('forge_user_color') || getRandomColor();
  });

  // Sync state with URL hash
  useEffect(() => {
    const handleHashChange = () => {
      const room = parseRoomFromUrl(window.location.href);
      setRoomId(room);
    };

    window.addEventListener('hashchange', handleHashChange);
    window.addEventListener('popstate', handleHashChange);

    return () => {
      window.removeEventListener('hashchange', handleHashChange);
      window.removeEventListener('popstate', handleHashChange);
    };
  }, []);

  const handleJoinRoom = (newRoomId: string, name: string, color: string) => {
    setUserName(name);
    setUserColor(color);
    setRoomId(newRoomId);
    window.location.hash = `#room=${encodeURIComponent(newRoomId)}`;
  };

  const handleLeaveRoom = () => {
    setRoomId(null);
    window.history.pushState(null, '', window.location.pathname);
  };

  if (!roomId) {
    return <LandingPage onJoinRoom={handleJoinRoom} />;
  }

  return (
    <WorkspaceView
      roomId={roomId}
      userName={userName}
      userColor={userColor}
      onLeave={handleLeaveRoom}
    />
  );
};

