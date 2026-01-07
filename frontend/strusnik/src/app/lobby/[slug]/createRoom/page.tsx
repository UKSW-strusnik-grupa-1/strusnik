'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { useParams, useRouter } from 'next/navigation';

import ReturnArrow from '@/app/components/lobby/returnArrow';
import { useSocket } from '@/app/hooks/useSocket';
import { useUser } from '@/app/hooks/useUser';

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
  const router = useRouter();
  const params = useParams<{ slug: string }>();
  const slug = params?.slug ?? 'Chess';

  const { socket, isConnected } = useSocket();
  const { userInfo } = useUser();

  const userToken = useMemo(() => {
    const v = (userInfo as any)?.userId;
    return v !== undefined && v !== null ? String(v) : null;
  }, [userInfo]);

  const [roomName, setRoomName] = useState('');
  const [usePassword, setUsePassword] = useState(false);
  const [password, setPassword] = useState('');

  const isChess = String(slug).toLowerCase() === 'chess';

  // chess-specific
  const [timeChoice, setTimeChoice] = useState<TimeChoice>(10);
  const [colorPref, setColorPref] = useState<ChessColorPref>('RANDOM');

  // generic
  const [playersChoice, setPlayersChoice] = useState<PlayersChoice>(2);

  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!socket) return;

    const onRoomCreated = (payload: any) => {
      try {
        if (!payload?.room_id) return;
        const game = String(payload?.game ?? '');
        if (game.toLowerCase() !== String(slug).toLowerCase()) return;

        setCreating(false);
        router.push(`/games/${slug}/${payload.room_id}`);
      } catch {
        // ignore
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
      setError('BRAK POLACZENIA Z SERWEREM.');
      return;
    }

    const name = roomName.trim();
    if (name.length < 2) {
      setError('PODAJ NAZWE POKOJU.');
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
      payload.color_preference =
        colorPref === 'WHITE' ? 'white' : colorPref === 'BLACK' ? 'black' : 'random';
    } else {
      payload.max_players = playersChoice;
    }

    socket.emit('create_room', payload);
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden">
      
      <div className="absolute inset-0 bg-black/35" />

      {/* Return */}
      <div className="absolute left-4 top-4 z-20">
        <ReturnArrow href={`/lobby/${slug}`} text="WYJDZ" />
      </div>

      <div className="relative z-10 w-full h-full flex items-center justify-center px-4">
        <div className="w-full max-w-[820px]">
          <div className="mx-auto w-full max-w-[560px] space-y-5">
            {/* Room name */}
            <div className="space-y-2">
              <div className="text-amber-50 font-extrabold uppercase tracking-wide text-sm">Nazwa pokoju</div>
              <div className="relative">
                <input
                  value={roomName}
                  onChange={(e) => setRoomName(e.target.value)}
                  placeholder="PODAJ NAZWE POKOJU..."
                  className="w-full h-[46px] rounded-lg bg-black/45 border border-white/10 px-4 text-white placeholder:text-white/40 outline-none focus:border-white/25"
                />
              </div>
            </div>

            {/* Chess options */}
            {isChess ? (
              <>
                <div className="space-y-2">
                  <div className="text-amber-50 font-extrabold uppercase tracking-wide text-sm">Czas</div>
                  <div className="flex flex-wrap gap-3">
                    <ButtonPng label="5 MIN" active={timeChoice === 5} onClick={() => setTimeChoice(5)} />
                    <ButtonPng label="10 MIN" active={timeChoice === 10} onClick={() => setTimeChoice(10)} />
                    <ButtonPng label="15 MIN" active={timeChoice === 15} onClick={() => setTimeChoice(15)} />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="text-amber-50 font-extrabold uppercase tracking-wide text-sm">Gram</div>
                  <div className="flex flex-wrap gap-3">
                    <ButtonPng label="BIALE" active={colorPref === 'WHITE'} onClick={() => setColorPref('WHITE')} />
                    <ButtonPng label="LOSOWO" active={colorPref === 'RANDOM'} onClick={() => setColorPref('RANDOM')} />
                    <ButtonPng label="CZARNE" active={colorPref === 'BLACK'} onClick={() => setColorPref('BLACK')} />
                  </div>
                </div>
              </>
            ) : (
              <div className="space-y-2">
                <div className="text-amber-50 font-extrabold uppercase tracking-wide text-sm">ILOSC GRACZY</div>
                <div className="flex flex-wrap gap-3">
                  <ButtonPng label="2" active={playersChoice === 2} onClick={() => setPlayersChoice(2)} />
                  <ButtonPng label="3" active={playersChoice === 3} onClick={() => setPlayersChoice(3)} />
                  <ButtonPng label="4" active={playersChoice === 4} onClick={() => setPlayersChoice(4)} />
                </div>
              </div>
            )}

            {/* Password */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="text-amber-50 font-extrabold uppercase tracking-wide text-sm">HASLO DO POKOJU</div>
                <button
                  type="button"
                  onClick={() => setUsePassword((v) => !v)}
                  className="w-6 h-6 rounded border border-white/20 bg-black/40 flex items-center justify-center"
                  aria-label="Toggle password"
                >
                  {usePassword ? <div className="w-3 h-3 bg-amber-300/80 rounded-sm" /> : null}
                </button>
              </div>

              {usePassword && (
                <input
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="WPISZ HASLO..."
                  className="w-full h-[46px] rounded-lg bg-black/45 border border-white/10 px-4 text-white placeholder:text-white/40 outline-none focus:border-white/25"
                />
              )}
            </div>

            {/* Create */}
            <div className="pt-2 flex items-center justify-center">
              <ButtonPng label={creating ? 'TWORZENIE...' : 'STWORZ POKOJ'} onClick={createRoom} disabled={creating} />
            </div>

            {error && <div className="text-center text-red-200 font-semibold drop-shadow-md">{error}</div>}
          </div>
        </div>
      </div>
    </div>
  );
}