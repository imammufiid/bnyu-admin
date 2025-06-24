"use client";
import { useEffect, useState } from "react";
import { Eye } from "lucide-react";
import type { QueryDocumentSnapshot, DocumentData, Timestamp } from "firebase/firestore";

interface User {
  id: string;
  displayName?: string;
  email?: string;
  points: number;
  isVerified?: boolean;
  createdAt?: Timestamp;
  uid?: string;
  lastActive?: Timestamp | string;
}

export default function UsersTable() {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [reminderStats, setReminderStats] = useState<{ today: string; week: string; month: string } | null>(null);
    const [page, setPage] = useState(1);
    const rowsPerPage = 10;
    const [search, setSearch] = useState("");
    const [sortBy, setSortBy] = useState<'no' | 'displayName' | 'email' | 'points' | 'isVerified' | 'lastActive'>('no');
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

    function handleSort(col: typeof sortBy) {
        if (sortBy === col) {
            setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
        } else {
            setSortBy(col);
            setSortDir('asc');
        }
        setPage(1);
    }

    useEffect(() => {
        async function fetchUsers() {
            setLoading(true);
            setError("");
            try {
                const { collection, getDocs, query, where } = await import("firebase/firestore");
                const { db } = await import("@/lib/firebase");
                const usersCol = collection(db, "users");
                const usersSnapshot = await getDocs(usersCol);
                const usersData = await Promise.all(
                    usersSnapshot.docs.map(async (doc) => {
                        const user = { id: doc.id, ...doc.data() };
                        // Fetch points for this user
                        const pointsCol = collection(db, "points");
                        const pointsQuery = query(pointsCol, where("userId", "==", user.id));
                        const pointsSnapshot = await getDocs(pointsQuery);
                        console.log('User:', user.id, 'Points docs:', pointsSnapshot.docs.map(d => d.data()));
                        let points = 0;
                        if (!pointsSnapshot.empty) {
                            console.log('User:', user.id, 'Points doc:', pointsSnapshot.docs[0].data().points || 0);
                            // Use only the first points document's value
                            points = pointsSnapshot.docs[0].data().points || 0;
                        }
                        // Fetch last active (latest reminder)
                        const remindersCol = collection(db, "reminders");
                        const remindersQuery = query(remindersCol, where("userId", "==", user.id));
                        const remindersSnapshot = await getDocs(remindersQuery);
                        let lastActive: Timestamp | string | undefined = undefined;
                        if (!remindersSnapshot.empty) {
                            const latest = remindersSnapshot.docs.reduce((a, b) => {
                                const aDate = a.data().createdAt;
                                const bDate = b.data().createdAt;
                                if (aDate && bDate) {
                                    return (aDate.seconds || 0) > (bDate.seconds || 0) ? a : b;
                                }
                                return a;
                            });
                            lastActive = latest.data().createdAt;
                        }
                        return { ...user, points, lastActive };
                    })
                );

                setUsers(usersData);
            } catch {
                setError("Failed to fetch users");
            } finally {
                setLoading(false);
            }
        }
        fetchUsers();
    }, []);

    // Fetch reminder stats for selected user
    useEffect(() => {
        if (!selectedUser) return;
        console.log(selectedUser.uid);

        async function fetchUserReminderStats() {
            const { collection, getDocs, query, where, Timestamp } = await import("firebase/firestore");
            const { db } = await import("@/lib/firebase");
            const remindersCol = collection(db, "reminders");
            const now = new Date();
            // Today
            const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
            const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
            const startDayTs = Timestamp.fromDate(startOfDay);
            const endDayTs = Timestamp.fromDate(endOfDay);
            if (!selectedUser) return;
            const qToday = query(remindersCol, where("userId", "==", selectedUser.uid), where("createdAt", ">=", startDayTs), where("createdAt", "<=", endDayTs));
            const snapToday = await getDocs(qToday);
            let drinkToday = 0, notDrinkToday = 0;
            const todayReminders: { createdAt: unknown; isDrink: boolean }[] = [];
            snapToday.forEach((doc: QueryDocumentSnapshot<DocumentData>) => {
                const data = doc.data();
                todayReminders.push({ createdAt: data.createdAt, isDrink: data.isDrink });
                if (data.isDrink === true) drinkToday++;
                else if (data.isDrink === false) notDrinkToday++;
            });
            console.log('Today reminders:', todayReminders);
            // Week
            const day = now.getDay();
            const diffToMonday = (day === 0 ? -6 : 1) - day;
            const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diffToMonday, 0, 0, 0, 0);
            const endOfWeek = new Date(startOfWeek);
            endOfWeek.setDate(startOfWeek.getDate() + 6);
            endOfWeek.setHours(23, 59, 59, 999);
            const startWeekTs = Timestamp.fromDate(startOfWeek);
            const endWeekTs = Timestamp.fromDate(endOfWeek);
            if (!selectedUser) return;
            const qWeek = query(remindersCol, where("userId", "==", selectedUser.uid), where("createdAt", ">=", startWeekTs), where("createdAt", "<=", endWeekTs));
            const snapWeek = await getDocs(qWeek);
            let drinkWeek = 0, notDrinkWeek = 0;
            const weekReminders: { createdAt: unknown; isDrink: boolean }[] = [];
            snapWeek.forEach((doc: QueryDocumentSnapshot<DocumentData>) => {
                const data = doc.data();
                weekReminders.push({ createdAt: data.createdAt, isDrink: data.isDrink });
                if (data.isDrink === true) drinkWeek++;
                else if (data.isDrink === false) notDrinkWeek++;
            });
            console.log('Week reminders:', weekReminders);
            // Month
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
            const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
            const startMonthTs = Timestamp.fromDate(startOfMonth);
            const endMonthTs = Timestamp.fromDate(endOfMonth);
            if (!selectedUser) return;
            const qMonth = query(remindersCol, where("userId", "==", selectedUser.uid), where("createdAt", ">=", startMonthTs), where("createdAt", "<=", endMonthTs));
            const snapMonth = await getDocs(qMonth);
            let drinkMonth = 0, notDrinkMonth = 0;
            const monthReminders: { createdAt: unknown; isDrink: boolean }[] = [];
            snapMonth.forEach((doc: QueryDocumentSnapshot<DocumentData>) => {
                const data = doc.data();
                monthReminders.push({ createdAt: data.createdAt, isDrink: data.isDrink });
                if (data.isDrink === true) drinkMonth++;
                else if (data.isDrink === false) notDrinkMonth++;
            });
            console.log('Month reminders:', monthReminders);
            setReminderStats({
                today: `${drinkToday}/${notDrinkToday}`,
                week: `${drinkWeek}/${notDrinkWeek}`,
                month: `${drinkMonth}/${notDrinkMonth}`
            });
        }
        fetchUserReminderStats();
    }, [selectedUser]);

    function formatDate(date: Date): string {
        const now = new Date();
        const isToday = date.toDateString() === now.toDateString();
        const yesterday = new Date(now);
        yesterday.setDate(now.getDate() - 1);
        const isYesterday = date.toDateString() === yesterday.toDateString();
        const time = date.toLocaleTimeString([], { hour12: false });
        if (isToday) return `Today, at ${time}`;
        if (isYesterday) return `Yesterday, at ${time}`;
        return `${date.getDate().toString().padStart(2, '0')} ${date.toLocaleString('default', { month: 'short' })} ${date.getFullYear()}, ${time}`;
    }

    // Filter users by search
    const filteredUsers = users.filter(user => {
        const q = search.toLowerCase();
        return (
            (user.displayName && user.displayName.toLowerCase().includes(q)) ||
            (user.email && user.email.toLowerCase().includes(q))
        );
    });

    // Sort users by selected column and direction
    const sortedUsers = [...filteredUsers].sort((a, b) => {
        let aVal: any, bVal: any;
        switch (sortBy) {
            case 'no':
                aVal = a;
                bVal = b;
                break;
            case 'displayName':
                aVal = a.displayName || '';
                bVal = b.displayName || '';
                break;
            case 'email':
                aVal = a.email || '';
                bVal = b.email || '';
                break;
            case 'points':
                aVal = a.points || 0;
                bVal = b.points || 0;
                break;
            case 'isVerified':
                aVal = a.isVerified ? 1 : 0;
                bVal = b.isVerified ? 1 : 0;
                break;
            case 'lastActive':
                aVal = a.lastActive && typeof a.lastActive === 'object' && a.lastActive !== null && 'toDate' in a.lastActive && typeof a.lastActive.toDate === 'function'
                    ? a.lastActive.toDate().getTime()
                    : 0;
                bVal = b.lastActive && typeof b.lastActive === 'object' && b.lastActive !== null && 'toDate' in b.lastActive && typeof b.lastActive.toDate === 'function'
                    ? b.lastActive.toDate().getTime()
                    : 0;
                break;
            default:
                aVal = a;
                bVal = b;
        }
        if (aVal < bVal) return sortDir === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortDir === 'asc' ? 1 : -1;
        return 0;
    });

    const paginatedUsers = sortedUsers.slice((page - 1) * rowsPerPage, page * rowsPerPage);
    const totalPages = Math.ceil(filteredUsers.length / rowsPerPage);

    return (
        <div className="w-full">
            <h2 className="text-2xl font-bold mb-4">Users</h2>
            <div className="mb-4 flex flex-col sm:flex-row gap-2 w-full">
                <input
                    type="text"
                    className="border rounded px-3 py-2 w-full sm:w-64 bg-white"
                    placeholder="Search"
                    value={search}
                    onChange={e => { setSearch(e.target.value); setPage(1); }}
                />
            </div>
            <div className="bg-white p-6 rounded-lg shadow w-full">
                {loading ? (
                    <div>Loading...</div>
                ) : error ? (
                    <div className="text-red-600">{error}</div>
                ) : (
                    <div className="overflow-x-auto w-full">
                        <table className="min-w-full border text-sm w-full">
                            <thead className="sticky top-0 bg-gray-100 z-10">
                                <tr>
                                    <th className="px-4 py-2 border cursor-pointer select-none" onClick={() => handleSort('no')}>
                                        No. {sortBy === 'no' && (sortDir === 'asc' ? '▲' : '▼')}
                                    </th>
                                    <th className="px-4 py-2 border cursor-pointer select-none" onClick={() => handleSort('displayName')}>
                                        Name {sortBy === 'displayName' && (sortDir === 'asc' ? '▲' : '▼')}
                                    </th>
                                    <th className="px-4 py-2 border cursor-pointer select-none" onClick={() => handleSort('email')}>
                                        Email {sortBy === 'email' && (sortDir === 'asc' ? '▲' : '▼')}
                                    </th>
                                    <th className="px-4 py-2 border cursor-pointer select-none" onClick={() => handleSort('points')}>
                                        Points {sortBy === 'points' && (sortDir === 'asc' ? '▲' : '▼')}
                                    </th>
                                    <th className="px-4 py-2 border cursor-pointer select-none" onClick={() => handleSort('isVerified')}>
                                        Verified {sortBy === 'isVerified' && (sortDir === 'asc' ? '▲' : '▼')}
                                    </th>
                                    <th className="px-4 py-2 border cursor-pointer select-none" onClick={() => handleSort('lastActive')}>
                                        Last Active {sortBy === 'lastActive' && (sortDir === 'asc' ? '▲' : '▼')}
                                    </th>
                                    <th className="px-4 py-2 border">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {paginatedUsers.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="text-center py-4">No users found.</td>
                                    </tr>
                                ) : (
                                    paginatedUsers.map((user, idx) => (
                                        <tr key={user.id} className={idx % 2 === 0 ? "bg-white" : "bg-gray-50" + " hover:bg-blue-50 transition-colors"}>
                                            <td className="px-4 py-2 border">{(page - 1) * rowsPerPage + idx + 1}</td>
                                            <td className="px-4 py-2 border">{user.displayName || '-'}</td>
                                            <td className="px-4 py-2 border">{user.email || '-'}</td>
                                            <td className="px-4 py-2 border">{user.points}</td>
                                            <td className="px-4 py-2 border">
                                                {user.isVerified ? (
                                                    <span className="inline-block px-2 py-1 text-xs rounded bg-green-100 text-green-700 font-semibold">Verified</span>
                                                ) : (
                                                    <span className="inline-block px-2 py-1 text-xs rounded bg-gray-200 text-gray-600 font-semibold">Unverified</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-2 border">
                                                {user.lastActive
                                                    ? (typeof user.lastActive === 'object' && user.lastActive !== null && 'toDate' in user.lastActive && typeof user.lastActive.toDate === 'function'
                                                        ? formatDate(user.lastActive.toDate())
                                                        : typeof user.lastActive === 'string'
                                                            ? user.lastActive
                                                            : '-')
                                                    : '-'}
                                            </td>
                                            <td className="px-4 py-2 border text-center">
                                                <button className="p-2 rounded hover:bg-blue-100 transition-colors" title="View Details" onClick={() => setSelectedUser(user)}>
                                                    <Eye size={18} className="text-blue-600" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                        {/* Pagination controls */}
                        {totalPages > 1 && (
                            <div className="flex justify-center items-center gap-2 mt-4">
                                <button
                                    className="px-3 py-1 rounded bg-gray-200 hover:bg-gray-300 text-sm font-semibold"
                                    onClick={() => setPage(p => Math.max(1, p - 1))}
                                    disabled={page === 1}
                                >
                                    Previous
                                </button>
                                <span className="text-sm">Page {page} of {totalPages}</span>
                                <button
                                    className="px-3 py-1 rounded bg-gray-200 hover:bg-gray-300 text-sm font-semibold"
                                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                    disabled={page === totalPages}
                                >
                                    Next
                                </button>
                            </div>
                        )}
                    </div>
                )}
                {/* Modal for user detail */}
                {selectedUser && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/30 backdrop-blur-md">
                        <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-sm relative">
                            <button
                                className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 text-xl font-bold"
                                onClick={() => setSelectedUser(null)}
                                aria-label="Close"
                            >
                                ×
                            </button>
                            <div className="flex flex-col items-center gap-4">
                                <div className="h-16 w-16 rounded-full bg-blue-100 flex items-center justify-center text-2xl font-bold text-blue-600">
                                    {selectedUser.displayName ? selectedUser.displayName.charAt(0).toUpperCase() : "A"}
                                </div>
                                <div className="text-lg font-semibold">{selectedUser.displayName || '-'}</div>
                                <div className="text-gray-500">{selectedUser.email || '-'}</div>
                                <div className="text-gray-700 font-medium">Points: {selectedUser.points}</div>
                                <div className="text-gray-400 text-xs">
                                    Created At: {selectedUser.createdAt
                                        ? (typeof selectedUser.createdAt === 'object' && selectedUser.createdAt !== null && 'toDate' in selectedUser.createdAt && typeof selectedUser.createdAt.toDate === 'function'
                                            ? formatDate(selectedUser.createdAt.toDate())
                                            : typeof selectedUser.createdAt === 'string'
                                                ? selectedUser.createdAt
                                                : '-')
                                        : '-'}
                                </div>
                                <div className="w-full mt-4">
                                    <div className="font-semibold mb-2 text-sm text-gray-700">Active Reminders</div>
                                    <div className="flex flex-col sm:flex-row gap-2 mb-2">
                                        <div className="flex-1 bg-green-50 rounded-lg p-3 flex flex-col items-center shadow">
                                            <div className="text-xs text-gray-500 mb-1">Today</div>
                                            <div className="text-lg font-bold text-green-600">{reminderStats ? reminderStats.today : '--'}</div>
                                        </div>
                                        <div className="flex-1 bg-yellow-50 rounded-lg p-3 flex flex-col items-center shadow">
                                            <div className="text-xs text-gray-500 mb-1">This Week</div>
                                            <div className="text-lg font-bold text-yellow-600">{reminderStats ? reminderStats.week : '--'}</div>
                                        </div>
                                        <div className="flex-1 bg-purple-50 rounded-lg p-3 flex flex-col items-center shadow">
                                            <div className="text-xs text-gray-500 mb-1">This Month</div>
                                            <div className="text-lg font-bold text-purple-600">{reminderStats ? reminderStats.month : '--'}</div>
                                        </div>
                                    </div>
                                    <div className="flex gap-2 justify-center text-xs text-gray-500 mt-1">
                                        <div><span className="inline-block w-3 h-3 bg-green-400 rounded-full mr-1 align-middle"></span>isDrink = true</div>
                                        <div><span className="inline-block w-3 h-3 bg-gray-400 rounded-full mr-1 align-middle"></span>isDrink = false</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
} 