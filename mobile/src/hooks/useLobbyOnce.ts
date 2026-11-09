import type { LobbyResponse } from '@shared/types';
import { useEffect, useState } from 'react';
import { api, errorText } from '@/api/client';

/** Лобби-г нэг удаа ачаална: үүсгэх, кодоор орох дэлгэцэд poll хэрэггүй (үр дүн нь лобби руу буцахад харагдана). */
export function useLobbyOnce() {
  const [lobby, setLobby] = useState<LobbyResponse | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    api<LobbyResponse>('/duels').then(setLobby, (e) => setError(errorText(e)));
  }, []);
  return { lobby, error };
}
