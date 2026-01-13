'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { useParams, useRouter } from 'next/navigation';
import ReturnArrow from '@/app/components/lobby/returnArrow';
import { useSocket } from '@/app/hooks/useSocket';
import { useUser } from '@/app/hooks/useUser';
import { useLang } from '@/app/lang';
import { t } from '@/app/i18n';
import ActiveGameBanner from '@/app/components/lobby/ActiveGameBanner';

// Normalizuje nazwę gry do prawidłowej formy (zgodnej z folderami w /games/)
function normalizeGameName(name: string): string {
  const normalized: Record<string, string> = {
    'chess': 'Chess',
    'stratego': 'Stratego',
    'tysiac': 'Tysiac',
    'battleships': 'Battleships',
    'set': 'Set',
  };
  return normalized[name.toLowerCase()] || name;
}

type ChessColorPref = 'WHITE' | 'RANDOM' | 'BLACK';
type TimeChoice = 5 | 10 | 15;
type PlayersChoice = 2 | 3 | 4;

function ButtonPng({
  label,
  active,
  onClick,
  disabled,
}: {
  label: string;
  active?: boolean;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={[
        'relative w-[170px] h-[46px] transition select-none',
        disabled ? 'opacity-60 cursor-not-allowed' : 'hover:brightness-110 active:brightness-95',
      ].join(' ')}
    >
      <Image src="/main/button.png" alt="" fill className="object-contain" draggable={false} />
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <span
          className={[
            'text-white font-extrabold uppercase tracking-wide drop-shadow-md text-sm',
            active ? 'scale-[1.03]' : '',
          ].join(' ')}
        >
          {label}
        </span>
      </div>
      {active && <div className="absolute inset-0 rounded-xl ring-2 ring-amber-300/70 pointer-events-none" />}
    </button>
  );
}

export default function CreateRoomPage() {
  const { lang } = useLang();

  const router = useRouter();
  const params = useParams<{ slug: string }>();
  const slug = params?.slug ?? 'chess';
  const { socket, isConnected } = useSocket();
  const { userInfo } = useUser();

  const [roomName, setRoomName] = useState('');
  const [usePassword, setUsePassword] = useState(false);
  const [password, setPassword] = useState('');

  const isChess = String(slug).toLowerCase() === 'chess';
  const gameSlug = String(slug).toLowerCase();

  // Określenie dostępnych opcji liczby graczy na podstawie gry
  const availablePlayerCounts = useMemo(() => {
    if (gameSlug === 'tysiac') {
      return [3, 4];
    }
    if (gameSlug === 'stratego' || gameSlug === 'battleships') {
      return [2];
    }
    if (gameSlug === 'set') {
      return [2, 3, 4];
    }
    // Domyślnie dla reszty gier (poza szachami, które mają osobne UI)
    return [2, 3, 4];
  }, [gameSlug]);

  // Sprawdź czy gra wymaga tylko 2 graczy (nie pokazuj wyboru)
  const hidePlayersChoice = gameSlug === 'battleships' || gameSlug === 'stratego';

  const [timeChoice, setTimeChoice] = useState<TimeChoice>(10);
  const [colorPref, setColorPref] = useState<ChessColorPref>('RANDOM');

  // Inicjalizacja stanu z poprawną wartością dla danej gry
  const [playersChoice, setPlayersChoice] = useState<PlayersChoice>(() => {
    const validDefault = availablePlayerCounts[0];
    return (validDefault === 2 || validDefault === 3 || validDefault === 4) ? validDefault : 2;
  });

  // Korekta liczby graczy, jeśli obecny wybór jest nieprawidłowy dla nowej gry (np. przy zmianie URL)
  useEffect(() => {
    if (!availablePlayerCounts.includes(playersChoice as number)) {
      setPlayersChoice(availablePlayerCounts[0] as PlayersChoice);
    }
  }, [availablePlayerCounts, playersChoice]);

  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const userToken = useMemo(() => {
    const v = (userInfo as any)?.userId;
    return v !== undefined && v !== null ? String(v) : null;
  }, [userInfo]);

  useEffect(() => {
    if (!socket) return;

    const onRoomCreated = (payload: any) => {
      try {
        if (!payload?.room_id) return;
        const game = String(payload?.game ?? '');
        if (game.toLowerCase() !== String(slug).toLowerCase()) return;

        setCreating(false);
        const normalizedSlug = normalizeGameName(slug);
        router.push(`/games/${normalizedSlug}/${payload.room_id}?autojoin=true`);
      } catch {
      }
    };

    socket.on('room_created', onRoomCreated);
    return () => {
      socket.off('room_created', onRoomCreated);
    };
  }, [socket, router, slug]);

  const createRoom = () => {
    setError(null);

    if (!socket || !isConnected) {
      setError(t(lang, 'create_room.error.no_server_connection'));
      return;
    }

    const name = roomName.trim();
    if (name.length < 2) {
      setError(t(lang, 'create_room.error.enter_room_name'));
      return;
    }

    setCreating(true);

    const payload: any = {
      game_name: slug,
      room_name: name,
      userToken: userToken ?? undefined,
    };

    if (usePassword) {
      payload.password = password || '';
    }

    if (isChess) {
      payload.max_players = 2;
      payload.time_control_min = timeChoice;
      payload.color_preference = colorPref === 'WHITE' ? 'white' : colorPref === 'BLACK' ? 'black' : 'random';
    } else {
      payload.max_players = playersChoice;
    }

    socket.emit('create_room', payload);
  };

  const { activeGame } = useSocket();

  return (
    <div className="relative w-screen h-screen overflow-hidden">
      <div className="absolute inset-0 bg-black/35" />

      {activeGame && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50">
          <ActiveGameBanner
            gameName={activeGame.gameName}
            roomId={activeGame.roomId}
            roomName={activeGame.roomName}
          />
        </div>
      )}

      <div className="absolute w-full h-screen flex flex-col overflow-visible">
        <ReturnArrow href={`/lobby/${slug}`} text={t(lang, 'arrow')} />
      </div>

      <div className="relative z-10 w-full h-full flex items-center justify-center px-4">
        <div className="w-full max-w-[820px]">
          <div className="mx-auto w-full max-w-[560px] space-y-5">
            <div className="space-y-2">
              <div className="text-amber-50 font-extrabold uppercase tracking-wide text-sm">
                {t(lang, 'create_room.room_name_label')}
              </div>
              <div className="relative">
                <input
                  value={roomName}
                  onChange={(e) => setRoomName(e.target.value)}
                  placeholder={t(lang, 'rooms.wtd_name')}
                  className="w-full h-[46px] rounded-lg bg-black/45 border border-white/10 px-4 text-white placeholder:text-white/40 outline-none focus:border-white/25"
                />
              </div>
            </div>

            {isChess ? (
              <>
                <div className="space-y-2">
                  <div className="text-amber-50 font-extrabold uppercase tracking-wide text-sm">
                    {t(lang, 'create_room.time_label')}
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <ButtonPng label={t(lang, 'create_room.time_5_min')} active={timeChoice === 5} onClick={() => setTimeChoice(5)} />
                    <ButtonPng label={t(lang, 'create_room.time_10_min')} active={timeChoice === 10} onClick={() => setTimeChoice(10)} />
                    <ButtonPng label={t(lang, 'create_room.time_15_min')} active={timeChoice === 15} onClick={() => setTimeChoice(15)} />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="text-amber-50 font-extrabold uppercase tracking-wide text-sm">
                    {t(lang, 'create_room.side_label')}
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <ButtonPng
                      label={t(lang, 'rooms.chess_color.white')}
                      active={colorPref === 'WHITE'}
                      onClick={() => setColorPref('WHITE')}
                    />
                    <ButtonPng
                      label={t(lang, 'rooms.chess_color.random')}
                      active={colorPref === 'RANDOM'}
                      onClick={() => setColorPref('RANDOM')}
                    />
                    <ButtonPng
                      label={t(lang, 'rooms.chess_color.black')}
                      active={colorPref === 'BLACK'}
                      onClick={() => setColorPref('BLACK')}
                    />
                  </div>
                </div>
              </>
            ) : !hidePlayersChoice ? (
              <div className="space-y-2">
                <div className="text-amber-50 font-extrabold uppercase tracking-wide text-sm">
                  {t(lang, 'rooms.players')}
                </div>
                <div className="flex flex-wrap gap-3">
                  {availablePlayerCounts.map((count) => (
                    <ButtonPng
                      key={count}
                      label={String(count)}
                      active={playersChoice === count}
                      onClick={() => setPlayersChoice(count as PlayersChoice)}
                    />
                  ))}
                </div>
              </div>
            ) : null}

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="text-amber-50 font-extrabold uppercase tracking-wide text-sm">
                  {t(lang, 'rooms.password')}
                </div>
                <button
                  type="button"
                  onClick={() => setUsePassword((v) => !v)}
                  className="w-6 h-6 rounded border border-white/20 bg-black/40 flex items-center justify-center"
                  aria-label={t(lang, 'create_room.toggle_password')}
                >
                  {usePassword ? <div className="w-3 h-3 bg-amber-300/80 rounded-sm" /> : null}
                </button>
              </div>

              {usePassword && (
                <input
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t(lang, 'create_room.password_placeholder')}
                  className="w-full h-[46px] rounded-lg bg-black/45 border border-white/10 px-4 text-white placeholder:text-white/40 outline-none focus:border-white/25"
                />
              )}
            </div>

            <div className="pt-2 flex items-center justify-center">
              <ButtonPng
                label={creating ? t(lang, 'create_room.creating') : t(lang, 'rooms.create')}
                onClick={createRoom}
                disabled={creating}
              />
            </div>

            {error && <div className="text-center text-red-200 font-semibold drop-shadow-md">{error}</div>}
          </div>
        </div>
      </div>
    </div>
  );
}