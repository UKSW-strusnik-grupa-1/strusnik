'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useLang } from '@/app/lang';
import { t } from '@/app/i18n';
import ReturnArrow from '@/app/components/lobby/returnArrow';

interface User {
    id: number;
    name: string;
    is_admin: boolean;
    is_banned: boolean;
    created_at: string;
    last_login: string | null;
}

interface Ban {
    id: number;
    user_id: number;
    user_name: string;
    banned_by_id: number;
    banned_by_name: string;
    reason: string;
    banned_at: string;
    expires_at: string | null;
    is_active: boolean;
    unbanned_at: string | null;
    unbanned_by_name: string | null;
}

interface AdminLog {
    id: number;
    admin_id: number;
    admin_name: string;
    action: string;
    target_user_id: number | null;
    target_user_name: string | null;
    details: string;
    ip_address: string;
    created_at: string;
}

interface Stats {
    total_users: number;
    banned_users: number;
    active_bans: number;
    recent_bans_24h: number;
    recent_actions_24h: number;
    new_users_24h: number;
}

type TabType = 'users' | 'bans' | 'logs';

export default function AdminPanel() {
    const router = useRouter();
    const { lang } = useLang();

    const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
    const [activeTab, setActiveTab] = useState<TabType>('users');

    const [users, setUsers] = useState<User[]>([]);
    const [bans, setBans] = useState<Ban[]>([]);
    const [logs, setLogs] = useState<AdminLog[]>([]);
    const [stats, setStats] = useState<Stats | null>(null);

    const [usersPage, setUsersPage] = useState(1);
    const [bansPage, setBansPage] = useState(1);
    const [logsPage, setLogsPage] = useState(1);
    const [totalUsersPages, setTotalUsersPages] = useState(1);
    const [totalBansPages, setTotalBansPages] = useState(1);
    const [totalLogsPages, setTotalLogsPages] = useState(1);

    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [banModalOpen, setBanModalOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [banReason, setBanReason] = useState('');
    const [banDuration, setBanDuration] = useState<string>('permanent');

    const checkAdmin = useCallback(async () => {
        try {
            const res = await fetch('/api/admin/check', { credentials: 'include' });
            const data = await res.json();
            setIsAdmin(data.is_admin);
            if (!data.is_admin) {
                router.push('/');
            }
        } catch {
            setIsAdmin(false);
            router.push('/');
        }
    }, [router]);

    const fetchStats = useCallback(async () => {
        try {
            const res = await fetch('/api/admin/stats', { credentials: 'include' });
            if (res.ok) {
                const data = await res.json();
                setStats(data);
            }
        } catch (e) {
            console.error('Failed to fetch stats:', e);
        }
    }, []);

    const fetchUsers = useCallback(async (page: number, search: string = '') => {
        setLoading(true);
        try {
            const params = new URLSearchParams({ page: String(page), per_page: '15' });
            if (search) params.append('search', search);
            const res = await fetch(`/api/admin/users?${params}`, { credentials: 'include' });
            if (res.ok) {
                const data = await res.json();
                setUsers(data.users);
                setTotalUsersPages(data.pages);
            }
        } catch (e) {
            setError('Failed to fetch users');
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchBans = useCallback(async (page: number) => {
        setLoading(true);
        try {
            const res = await fetch(`/api/admin/bans?page=${page}&per_page=15`, { credentials: 'include' });
            if (res.ok) {
                const data = await res.json();
                setBans(data.bans);
                setTotalBansPages(data.pages);
            }
        } catch (e) {
            setError('Failed to fetch bans');
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchLogs = useCallback(async (page: number) => {
        setLoading(true);
        try {
            const res = await fetch(`/api/admin/logs?page=${page}&per_page=20`, { credentials: 'include' });
            if (res.ok) {
                const data = await res.json();
                setLogs(data.logs);
                setTotalLogsPages(data.pages);
            }
        } catch (e) {
            setError('Failed to fetch logs');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        checkAdmin();
    }, [checkAdmin]);

    useEffect(() => {
        if (isAdmin) {
            fetchStats();
            if (activeTab === 'users') fetchUsers(usersPage, searchQuery);
            if (activeTab === 'bans') fetchBans(bansPage);
            if (activeTab === 'logs') fetchLogs(logsPage);
        }
    }, [isAdmin, activeTab, usersPage, bansPage, logsPage, fetchStats, fetchUsers, fetchBans, fetchLogs, searchQuery]);

    const handleBanUser = async () => {
        if (!selectedUser) return;
        try {
            const duration = banDuration === 'permanent' ? null : parseInt(banDuration);
            const res = await fetch('/api/admin/ban', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    user_id: selectedUser.id,
                    reason: banReason,
                    duration_hours: duration
                })
            });
            if (res.ok) {
                setBanModalOpen(false);
                setBanReason('');
                setBanDuration('permanent');
                setSelectedUser(null);
                fetchUsers(usersPage, searchQuery);
                fetchStats();
            } else {
                const data = await res.json();
                setError(data.error || 'Failed to ban user');
            }
        } catch (e) {
            setError('Failed to ban user');
        }
    };

    const handleUnbanUser = async (userId: number) => {
        try {
            const res = await fetch('/api/admin/unban', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ user_id: userId })
            });
            if (res.ok) {
                fetchUsers(usersPage, searchQuery);
                fetchBans(bansPage);
                fetchStats();
            }
        } catch (e) {
            setError('Failed to unban user');
        }
    };

    const handleKickUser = async (userId: number) => {
        try {
            const res = await fetch('/api/admin/kick', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ user_id: userId, reason: 'Kicked by administrator' })
            });
            if (res.ok) {
                alert('User kicked successfully');
            }
        } catch (e) {
            setError('Failed to kick user');
        }
    };

    const handleToggleAdmin = async (userId: number, currentlyAdmin: boolean) => {
        const endpoint = currentlyAdmin ? '/api/admin/revoke-admin' : '/api/admin/make-admin';
        try {
            const res = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ user_id: userId })
            });
            if (res.ok) {
                fetchUsers(usersPage, searchQuery);
            }
        } catch (e) {
            setError('Failed to toggle admin status');
        }
    };

    const formatDate = (dateStr: string | null) => {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleString('pl-PL');
    };

    if (isAdmin === null) {
        return (
            <div className="min-h-screen bg-[#1a120b] flex items-center justify-center">
                <p className="text-amber-50 text-xl animate-pulse">Loading...</p>
            </div>
        );
    }

    if (!isAdmin) return null;

    return (
        <div className="min-h-screen bg-[#1a120b] text-amber-50">
            <div className="absolute inset-0 bg-black/35" />

            <div className="fixed top-0 left-0 z-50">
                <ReturnArrow href="/" text={t(lang, 'arrow')} />
            </div>

            <div className="relative z-10 container mx-auto px-4 py-20">
                <h1 className="text-3xl font-extrabold uppercase tracking-wide text-center mb-8">
                    Panel Administratora
                </h1>

                {stats && (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
                        <StatCard label="Użytkownicy" value={stats.total_users} />
                        <StatCard label="Zbanowani" value={stats.banned_users} color="red" />
                        <StatCard label="Aktywne bany" value={stats.active_bans} color="red" />
                        <StatCard label="Bany (24h)" value={stats.recent_bans_24h} />
                        <StatCard label="Akcje (24h)" value={stats.recent_actions_24h} />
                        <StatCard label="Nowi (24h)" value={stats.new_users_24h} color="green" />
                    </div>
                )}

                {error && (
                    <div className="bg-red-900/50 border border-red-500 rounded-lg p-4 mb-4">
                        <p className="text-red-200">{error}</p>
                        <button onClick={() => setError(null)} className="text-sm underline mt-2">Dismiss</button>
                    </div>
                )}

                <div className="flex gap-2 mb-6">
                    <TabButton active={activeTab === 'users'} onClick={() => setActiveTab('users')}>
                        Użytkownicy
                    </TabButton>
                    <TabButton active={activeTab === 'bans'} onClick={() => setActiveTab('bans')}>
                        Historia Banów
                    </TabButton>
                    <TabButton active={activeTab === 'logs'} onClick={() => setActiveTab('logs')}>
                        Logi
                    </TabButton>
                </div>

                {activeTab === 'users' && (
                    <div>
                        <div className="mb-4">
                            <input
                                type="text"
                                placeholder="Szukaj użytkownika..."
                                value={searchQuery}
                                onChange={(e) => {
                                    setSearchQuery(e.target.value);
                                    setUsersPage(1);
                                }}
                                className="w-full md:w-96 px-4 py-2 bg-black/50 border border-amber-900/50 rounded-lg text-amber-50 placeholder-amber-50/50 focus:outline-none focus:border-amber-500"
                            />
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full bg-black/30 rounded-lg overflow-hidden">
                                <thead className="bg-amber-900/30">
                                    <tr>
                                        <th className="px-4 py-3 text-left">ID</th>
                                        <th className="px-4 py-3 text-left">Nazwa</th>
                                        <th className="px-4 py-3 text-left">Status</th>
                                        <th className="px-4 py-3 text-left">Utworzony</th>
                                        <th className="px-4 py-3 text-left">Ostatnie logowanie</th>
                                        <th className="px-4 py-3 text-left">Akcje</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {users.map(user => (
                                        <tr key={user.id} className="border-t border-amber-900/20 hover:bg-amber-900/10">
                                            <td className="px-4 py-3">{user.id}</td>
                                            <td className="px-4 py-3">
                                                {user.name}
                                                {user.is_admin && <span className="ml-2 text-xs bg-amber-600 px-2 py-1 rounded">ADMIN</span>}
                                            </td>
                                            <td className="px-4 py-3">
                                                {user.is_banned ? (
                                                    <span className="text-red-400 font-bold">ZBANOWANY</span>
                                                ) : (
                                                    <span className="text-green-400">Aktywny</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-sm">{formatDate(user.created_at)}</td>
                                            <td className="px-4 py-3 text-sm">{formatDate(user.last_login)}</td>
                                            <td className="px-4 py-3">
                                                <div className="flex gap-2 flex-wrap">
                                                    {!user.is_admin && (
                                                        <>
                                                            {user.is_banned ? (
                                                                <ActionButton onClick={() => handleUnbanUser(user.id)} color="green">
                                                                    Odbanuj
                                                                </ActionButton>
                                                            ) : (
                                                                <ActionButton onClick={() => { setSelectedUser(user); setBanModalOpen(true); }} color="red">
                                                                    Banuj
                                                                </ActionButton>
                                                            )}
                                                            <ActionButton onClick={() => handleKickUser(user.id)} color="yellow">
                                                                Wyrzuć
                                                            </ActionButton>
                                                        </>
                                                    )}
                                                    <ActionButton onClick={() => handleToggleAdmin(user.id, user.is_admin)} color="blue">
                                                        {user.is_admin ? 'Odbierz Admin' : 'Daj Admin'}
                                                    </ActionButton>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <Pagination
                            currentPage={usersPage}
                            totalPages={totalUsersPages}
                            onPageChange={setUsersPage}
                        />
                    </div>
                )}

                {activeTab === 'bans' && (
                    <div>
                        <div className="overflow-x-auto">
                            <table className="w-full bg-black/30 rounded-lg overflow-hidden">
                                <thead className="bg-amber-900/30">
                                    <tr>
                                        <th className="px-4 py-3 text-left">Użytkownik</th>
                                        <th className="px-4 py-3 text-left">Zbanowany przez</th>
                                        <th className="px-4 py-3 text-left">Powód</th>
                                        <th className="px-4 py-3 text-left">Data bana</th>
                                        <th className="px-4 py-3 text-left">Wygasa</th>
                                        <th className="px-4 py-3 text-left">Status</th>
                                        <th className="px-4 py-3 text-left">Odbanowany</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {bans.map(ban => (
                                        <tr key={ban.id} className="border-t border-amber-900/20 hover:bg-amber-900/10">
                                            <td className="px-4 py-3">{ban.user_name}</td>
                                            <td className="px-4 py-3">{ban.banned_by_name}</td>
                                            <td className="px-4 py-3 max-w-xs truncate">{ban.reason || '-'}</td>
                                            <td className="px-4 py-3 text-sm">{formatDate(ban.banned_at)}</td>
                                            <td className="px-4 py-3 text-sm">{ban.expires_at ? formatDate(ban.expires_at) : 'Permanentny'}</td>
                                            <td className="px-4 py-3">
                                                {ban.is_active ? (
                                                    <span className="text-red-400 font-bold">Aktywny</span>
                                                ) : (
                                                    <span className="text-gray-400">Nieaktywny</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-sm">
                                                {ban.unbanned_at ? (
                                                    <span>{formatDate(ban.unbanned_at)} przez {ban.unbanned_by_name}</span>
                                                ) : '-'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <Pagination
                            currentPage={bansPage}
                            totalPages={totalBansPages}
                            onPageChange={setBansPage}
                        />
                    </div>
                )}

                {activeTab === 'logs' && (
                    <div>
                        <div className="overflow-x-auto">
                            <table className="w-full bg-black/30 rounded-lg overflow-hidden">
                                <thead className="bg-amber-900/30">
                                    <tr>
                                        <th className="px-4 py-3 text-left">Data</th>
                                        <th className="px-4 py-3 text-left">Admin</th>
                                        <th className="px-4 py-3 text-left">Akcja</th>
                                        <th className="px-4 py-3 text-left">Cel</th>
                                        <th className="px-4 py-3 text-left">Szczegóły</th>
                                        <th className="px-4 py-3 text-left">IP</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {logs.map(log => (
                                        <tr key={log.id} className="border-t border-amber-900/20 hover:bg-amber-900/10">
                                            <td className="px-4 py-3 text-sm">{formatDate(log.created_at)}</td>
                                            <td className="px-4 py-3">{log.admin_name}</td>
                                            <td className="px-4 py-3">
                                                <ActionBadge action={log.action} />
                                            </td>
                                            <td className="px-4 py-3">{log.target_user_name || '-'}</td>
                                            <td className="px-4 py-3 max-w-xs truncate text-sm">{log.details || '-'}</td>
                                            <td className="px-4 py-3 text-sm font-mono">{log.ip_address || '-'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <Pagination
                            currentPage={logsPage}
                            totalPages={totalLogsPages}
                            onPageChange={setLogsPage}
                        />
                    </div>
                )}
            </div>

            {banModalOpen && selectedUser && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    <div className="absolute inset-0 bg-black/70" onClick={() => setBanModalOpen(false)} />
                    <div className="relative bg-[#2a1a10] border border-amber-900/50 rounded-xl p-6 w-full max-w-md">
                        <h2 className="text-xl font-bold mb-4">Banowanie: {selectedUser.name}</h2>

                        <div className="mb-4">
                            <label className="block text-sm mb-2">Powód bana</label>
                            <textarea
                                value={banReason}
                                onChange={(e) => setBanReason(e.target.value)}
                                className="w-full px-3 py-2 bg-black/50 border border-amber-900/50 rounded-lg text-amber-50 focus:outline-none focus:border-amber-500"
                                rows={3}
                                placeholder="Podaj powód bana..."
                            />
                        </div>

                        <div className="mb-6">
                            <label className="block text-sm mb-2">Czas trwania</label>
                            <select
                                value={banDuration}
                                onChange={(e) => setBanDuration(e.target.value)}
                                className="w-full px-3 py-2 bg-black/50 border border-amber-900/50 rounded-lg text-amber-50 focus:outline-none focus:border-amber-500"
                            >
                                <option value="1">1 godzina</option>
                                <option value="6">6 godzin</option>
                                <option value="24">24 godziny</option>
                                <option value="72">3 dni</option>
                                <option value="168">7 dni</option>
                                <option value="720">30 dni</option>
                                <option value="permanent">Permanentny</option>
                            </select>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={handleBanUser}
                                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg font-bold transition-colors"
                            >
                                Zbanuj
                            </button>
                            <button
                                onClick={() => setBanModalOpen(false)}
                                className="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded-lg font-bold transition-colors"
                            >
                                Anuluj
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {loading && (
                <div className="fixed bottom-4 right-4 bg-amber-900/80 px-4 py-2 rounded-lg">
                    <p className="text-sm animate-pulse">Ładowanie...</p>
                </div>
            )}
        </div>
    );
}

function StatCard({ label, value, color = 'amber' }: { label: string; value: number; color?: string }) {
    const colorClasses = {
        amber: 'bg-amber-900/30 border-amber-700/50',
        red: 'bg-red-900/30 border-red-700/50',
        green: 'bg-green-900/30 border-green-700/50',
    };
    return (
        <div className={`${colorClasses[color as keyof typeof colorClasses]} border rounded-lg p-4 text-center`}>
            <p className="text-2xl font-bold">{value}</p>
            <p className="text-sm opacity-80">{label}</p>
        </div>
    );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
    return (
        <button
            onClick={onClick}
            className={`px-6 py-2 rounded-lg font-bold transition-colors ${active ? 'bg-amber-600 text-white' : 'bg-black/30 hover:bg-amber-900/30'
                }`}
        >
            {children}
        </button>
    );
}

function ActionButton({ onClick, color, children }: { onClick: () => void; color: string; children: React.ReactNode }) {
    const colorClasses = {
        red: 'bg-red-600/80 hover:bg-red-600',
        green: 'bg-green-600/80 hover:bg-green-600',
        yellow: 'bg-yellow-600/80 hover:bg-yellow-600',
        blue: 'bg-blue-600/80 hover:bg-blue-600',
    };
    return (
        <button
            onClick={onClick}
            className={`${colorClasses[color as keyof typeof colorClasses]} px-3 py-1 rounded text-xs font-bold transition-colors`}
        >
            {children}
        </button>
    );
}

function ActionBadge({ action }: { action: string }) {
    const badges: Record<string, { bg: string; text: string }> = {
        ban: { bg: 'bg-red-600', text: 'BAN' },
        unban: { bg: 'bg-green-600', text: 'UNBAN' },
        kick: { bg: 'bg-yellow-600', text: 'KICK' },
        make_admin: { bg: 'bg-blue-600', text: 'ADMIN+' },
        revoke_admin: { bg: 'bg-purple-600', text: 'ADMIN-' },
    };
    const badge = badges[action] || { bg: 'bg-gray-600', text: action.toUpperCase() };
    return (
        <span className={`${badge.bg} px-2 py-1 rounded text-xs font-bold`}>
            {badge.text}
        </span>
    );
}

function Pagination({ currentPage, totalPages, onPageChange }: { currentPage: number; totalPages: number; onPageChange: (page: number) => void }) {
    if (totalPages <= 1) return null;
    return (
        <div className="flex justify-center gap-2 mt-4">
            <button
                onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                disabled={currentPage <= 1}
                className="px-3 py-1 bg-amber-900/30 rounded disabled:opacity-50"
            >
                ←
            </button>
            <span className="px-4 py-1">
                {currentPage} / {totalPages}
            </span>
            <button
                onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage >= totalPages}
                className="px-3 py-1 bg-amber-900/30 rounded disabled:opacity-50"
            >
                →
            </button>
        </div>
    );
}
