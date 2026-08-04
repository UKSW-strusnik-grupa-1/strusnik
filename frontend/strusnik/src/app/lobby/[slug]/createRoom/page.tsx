'use client';

import { ArrowUpRight, Check, Clock3, Gamepad2, LockKeyhole, UsersRound } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import ActiveGameBanner from '@/app/components/lobby/ActiveGameBanner';
import ReturnArrow from '@/app/components/lobby/returnArrow';
import { useSocket } from '@/app/hooks/useSocket';
import { t } from '@/app/i18n';
import { useLang } from '@/app/lang';
import { useUser } from '@/app/hooks/useUser';
import HaxballMapPreview from '@/app/components/haxball/HaxballMapPreview';
import { HAXBALL_DURATIONS, HAXBALL_MAPS, type HaxballMode } from '@/app/games/haxball/constants';

function normalizeGameName(name: string): string {
  const normalized: Record<string, string> = {
    chess: 'Chess',
    stratego: 'Stratego',
    tysiac: 'Tysiac',
    battleships: 'Battleships',
    set: 'Set',
    haxball: 'haxball',
  };

  return normalized[name.toLowerCase()] || name;
}

type ChessColorPref = 'WHITE' | 'RANDOM' | 'BLACK';
type TimeChoice = 5 | 10 | 15;
type PlayersChoice = 2 | 3 | 4;

type ChoiceButtonProps = {
  label: string;
  active: boolean;
  onClick: () => void;
};

function ChoiceButton({ label, active, onClick }: ChoiceButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`create-choice${active ? ' is-selected' : ''}`}
      aria-pressed={active}
    >
      <span>{label}</span>
      {active && <Check size={16} strokeWidth={2.4} aria-hidden="true" />}
    </button>
  );
}

interface RoomCreatedPayload {
  room_id?: string;
  game?: string;
}

interface CreateRoomPayload {
  game_name: string;
  room_name: string;
  userToken?: string;
  password?: string;
  max_players: number;
  time_control_min?: TimeChoice;
  color_preference?: 'white' | 'black' | 'random';
  observers_allowed?: boolean;
  match_mode?: HaxballMode;
  map_id?: string;
  duration_min?: 3 | 5 | 10;
}

export default function CreateRoomPage() {
  const { lang } = useLang();
  const router = useRouter();
  const params = useParams<{ slug: string }>();
  const slug = params?.slug ?? 'chess';
  const { socket, isConnected, activeGame } = useSocket();
  const { userInfo } = useUser();

  const gameSlug = String(slug).toLowerCase();
  const translatedGameTitle = t(lang, `games.${gameSlug}`);
  const gameTitle = translatedGameTitle.startsWith('games.') ? String(slug) : translatedGameTitle;
  const isChess = gameSlug === 'chess';
  const isHaxball = gameSlug === 'haxball';
  const hidePlayersChoice = gameSlug === 'battleships' || gameSlug === 'stratego' || isHaxball;

  const availablePlayerCounts = useMemo<PlayersChoice[]>(() => {
    if (gameSlug === 'tysiac') return [3, 4];
    if (gameSlug === 'stratego' || gameSlug === 'battleships') return [2];
    if (gameSlug === 'set') return [2, 3, 4];
    return [2, 3, 4];
  }, [gameSlug]);

  const [roomName, setRoomName] = useState('');
  const [usePassword, setUsePassword] = useState(false);
  const [password, setPassword] = useState('');
  const [timeChoice, setTimeChoice] = useState<TimeChoice>(10);
  const [colorPref, setColorPref] = useState<ChessColorPref>('RANDOM');
  const [haxballMode, setHaxballMode] = useState<HaxballMode>('1v1');
  const [haxballMapId, setHaxballMapId] = useState(HAXBALL_MAPS[0].id);
  const [haxballDuration, setHaxballDuration] = useState<3 | 5 | 10>(5);
  const [playersChoice, setPlayersChoice] = useState<PlayersChoice>(availablePlayerCounts[0]);
  const [observersAllowed, setObserversAllowed] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const activePlayersChoice = availablePlayerCounts.includes(playersChoice)
    ? playersChoice
    : availablePlayerCounts[0];
  const playerRange = availablePlayerCounts.length === 1
    ? String(availablePlayerCounts[0])
    : `${availablePlayerCounts[0]}–${availablePlayerCounts[availablePlayerCounts.length - 1]}`;
  const userToken = userInfo?.userId !== undefined && userInfo?.userId !== null
    ? String(userInfo.userId)
    : undefined;

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

    const payload: CreateRoomPayload = {
      game_name: slug,
      room_name: name,
      userToken,
      max_players: isChess ? 2 : isHaxball ? (haxballMode === '1v1' ? 2 : 4) : activePlayersChoice,
      observers_allowed: observersAllowed,
    };

    if (usePassword) {
      payload.password = password;
    }

    if (isChess) {
      payload.time_control_min = timeChoice;
      payload.color_preference = colorPref === 'WHITE' ? 'white' : colorPref === 'BLACK' ? 'black' : 'random';
    }

    if (isHaxball) {
      payload.match_mode = haxballMode;
      payload.map_id = haxballMapId;
      payload.duration_min = haxballDuration;
    }

    socket.emit('create_room', payload);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    createRoom();
  };

  useEffect(() => {
    if (!socket) return;

    const handleRoomCreated = (payload: RoomCreatedPayload) => {
      if (!payload?.room_id) return;
      if (String(payload.game ?? '').toLowerCase() !== gameSlug) return;

      setCreating(false);
      router.push(`/games/${normalizeGameName(slug)}/${payload.room_id}?autojoin=true&role=player`);
    };

    socket.on('room_created', handleRoomCreated);
    return () => {
      socket.off('room_created', handleRoomCreated);
    };
  }, [gameSlug, router, socket, slug]);

  return (
    <main id="main-content" className="create-room-shell safe-area-inset">
      <ReturnArrow href={`/lobby/${slug}`} text={t(lang, 'arrow')} />

      {activeGame && (
        <div className="create-room-active-game">
          <ActiveGameBanner
            gameName={activeGame.gameName}
            roomId={activeGame.roomId}
            roomName={activeGame.roomName}
          />
        </div>
      )}

      <div className="create-room-frame">
        <header className="create-room-heading">
          <p className="page-kicker">STRUSNIK / MULTIPLAYER</p>
          <h1 className="create-room-title">
            <span>{gameTitle}</span> {t(lang, 'create_room.title_suffix')}
          </h1>
          <p className="create-room-subtitle">{t(lang, 'create_room.page_subtitle')}</p>

          <div className="create-room-context">
            <span><Gamepad2 size={16} strokeWidth={2} aria-hidden="true" />{gameTitle}</span>
            <span><UsersRound size={16} strokeWidth={2} aria-hidden="true" />{t(lang, 'create_room.players_range')}: {isChess ? 2 : isHaxball ? haxballMode : playerRange}</span>
            {isChess && <span><Clock3 size={16} strokeWidth={2} aria-hidden="true" />{timeChoice} MIN</span>}
            {isHaxball && <span><Clock3 size={16} strokeWidth={2} aria-hidden="true" />{haxballDuration} MIN</span>}
          </div>
        </header>

        <section className="create-room-card" aria-labelledby="create-room-form-title">
          <div className="create-room-card-header">
            <div>
              <p className="create-room-card-kicker">{t(lang, 'create_room.form_kicker')}</p>
              <h2 id="create-room-form-title">{t(lang, 'create_room.form_title')}</h2>
            </div>
          </div>

          <form className="create-room-form" onSubmit={handleSubmit}>
            <div className="create-room-field">
              <label htmlFor="room-name">{t(lang, 'create_room.room_name_label')}</label>
              <input
                id="room-name"
                name="roomName"
                type="text"
                value={roomName}
                onChange={(event) => setRoomName(event.target.value)}
                placeholder={t(lang, 'rooms.wtd_name')}
                autoComplete="off"
                minLength={2}
                maxLength={40}
                required
                className="create-room-input"
              />
            </div>

            {isChess && (
              <>
                <fieldset className="create-room-fieldset">
                  <legend>{t(lang, 'create_room.time_label')}</legend>
                  <div className="create-choice-grid create-choice-grid--three">
                    <ChoiceButton label={t(lang, 'create_room.time_5_min')} active={timeChoice === 5} onClick={() => setTimeChoice(5)} />
                    <ChoiceButton label={t(lang, 'create_room.time_10_min')} active={timeChoice === 10} onClick={() => setTimeChoice(10)} />
                    <ChoiceButton label={t(lang, 'create_room.time_15_min')} active={timeChoice === 15} onClick={() => setTimeChoice(15)} />
                  </div>
                </fieldset>

                <fieldset className="create-room-fieldset">
                  <legend>{t(lang, 'create_room.side_label')}</legend>
                  <div className="create-choice-grid create-choice-grid--three">
                    <ChoiceButton label={t(lang, 'rooms.chess_color.white')} active={colorPref === 'WHITE'} onClick={() => setColorPref('WHITE')} />
                    <ChoiceButton label={t(lang, 'rooms.chess_color.random')} active={colorPref === 'RANDOM'} onClick={() => setColorPref('RANDOM')} />
                    <ChoiceButton label={t(lang, 'rooms.chess_color.black')} active={colorPref === 'BLACK'} onClick={() => setColorPref('BLACK')} />
                  </div>
                </fieldset>
              </>
            )}

            {isHaxball && (
              <>
                <fieldset className="create-room-fieldset">
                  <legend>{t(lang, 'haxball.mode')}</legend>
                  <div className="create-choice-grid create-choice-grid--two">
                    {(['1v1', '2v2'] as HaxballMode[]).map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        role="radio"
                        aria-checked={haxballMode === mode}
                        onClick={() => setHaxballMode(mode)}
                        className={`create-choice haxball-mode-choice${haxballMode === mode ? ' is-selected' : ''}`}
                      >
                        <span>{mode}</span>
                        {haxballMode === mode && <Check size={16} strokeWidth={2.4} aria-hidden="true" />}
                      </button>
                    ))}
                  </div>
                </fieldset>

                <fieldset className="create-room-fieldset">
                  <legend>{t(lang, 'haxball.duration')}</legend>
                  <div className="create-choice-grid create-choice-grid--three">
                    {HAXBALL_DURATIONS.map((duration) => (
                      <ChoiceButton
                        key={duration}
                        label={`${duration} MIN`}
                        active={haxballDuration === duration}
                        onClick={() => setHaxballDuration(duration)}
                      />
                    ))}
                  </div>
                </fieldset>

                <fieldset className="create-room-fieldset haxball-map-fieldset">
                  <legend>{t(lang, 'haxball.map')}</legend>
                  <div className="haxball-map-choice-grid" role="radiogroup" aria-label={t(lang, 'haxball.map')}>
                    {HAXBALL_MAPS.map((map) => {
                      const selected = haxballMapId === map.id;
                      return (
                        <button
                          key={map.id}
                          type="button"
                          role="radio"
                          aria-checked={selected}
                          onClick={() => setHaxballMapId(map.id)}
                          className={`haxball-map-choice${selected ? ' is-selected' : ''}`}
                        >
                          <HaxballMapPreview map={map} />
                          <span className="haxball-map-choice__copy">
                            <strong>{t(lang, `haxball.maps.${map.nameKey}`)}</strong>
                            <span>{t(lang, `haxball.maps.${map.descriptionKey}`)}</span>
                          </span>
                          {selected && <Check className="haxball-map-choice__check" size={18} strokeWidth={2.4} aria-hidden="true" />}
                        </button>
                      );
                    })}
                  </div>
                </fieldset>
              </>
            )}

            {!isChess && !hidePlayersChoice && (
              <fieldset className="create-room-fieldset">
                <legend>{t(lang, 'rooms.players')}</legend>
                <div className={`create-choice-grid ${availablePlayerCounts.length === 2 ? 'create-choice-grid--two' : 'create-choice-grid--three'}`}>
                  {availablePlayerCounts.map((count) => (
                    <ChoiceButton
                      key={count}
                      label={`${count} ${t(lang, 'create_room.players_unit')}`}
                      active={activePlayersChoice === count}
                      onClick={() => setPlayersChoice(count)}
                    />
                  ))}
                </div>
              </fieldset>
            )}

            <fieldset className="create-room-fieldset create-room-password-fieldset">
              <legend>{t(lang, 'rooms.password')}</legend>
              <label className="create-room-password-toggle">
                <input
                  type="checkbox"
                  checked={usePassword}
                  onChange={(event) => setUsePassword(event.target.checked)}
                  aria-label={t(lang, 'create_room.toggle_password')}
                />
                <span className="create-room-checkbox" aria-hidden="true">
                  <Check size={14} strokeWidth={2.5} />
                </span>
                <span>{t(lang, 'rooms.private')}</span>
              </label>

              {usePassword && (
                <div className="create-room-password-input">
                  <label className="sr-only" htmlFor="room-password">{t(lang, 'rooms.password')}</label>
                  <LockKeyhole size={17} strokeWidth={2} aria-hidden="true" />
                  <input
                    id="room-password"
                    name="password"
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder={t(lang, 'create_room.password_placeholder')}
                    autoComplete="new-password"
                    className="create-room-input"
                  />
                </div>
              )}
            </fieldset>

            <fieldset className="create-room-fieldset create-room-observers-fieldset">
              <legend>{t(lang, 'rooms.observers')}</legend>
              <label className="create-room-password-toggle">
                <input
                  type="checkbox"
                  checked={observersAllowed}
                  onChange={(event) => setObserversAllowed(event.target.checked)}
                  aria-label={t(lang, 'create_room.toggle_observers')}
                />
                <span className="create-room-checkbox" aria-hidden="true">
                  <Check size={14} strokeWidth={2.5} />
                </span>
                <span>{t(lang, 'create_room.toggle_observers')}</span>
              </label>
            </fieldset>

            {error && <p className="create-room-error" role="alert">{error}</p>}

            <button
              type="submit"
              className="create-room-submit"
              disabled={creating}
              aria-busy={creating}
            >
              <span>{creating ? t(lang, 'create_room.creating') : t(lang, 'rooms.create')}</span>
              {!creating && <ArrowUpRight size={18} strokeWidth={2} aria-hidden="true" />}
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
