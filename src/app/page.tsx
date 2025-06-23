'use client';

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LayoutDashboard, User, LogOut, ArrowRightCircle, ArrowLeftCircle, Users as UsersIcon, LogOutIcon } from "lucide-react";
import UsersTable from "./components/UsersTable";
import ProfileCard from "./components/ProfileCard";

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<{ name: string; email: string } | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activePage, setActivePage] = useState<'dashboard' | 'profile' | 'users'>('dashboard');
  const [totalUsers, setTotalUsers] = useState<number | null>(null);
  const [reminderStats, setReminderStats] = useState<{ drink: number; notDrink: number } | null>(null);
  const [reminderStatsWeek, setReminderStatsWeek] = useState<{ drink: number; notDrink: number } | null>(null);
  const [reminderStatsMonth, setReminderStatsMonth] = useState<{ drink: number; notDrink: number } | null>(null);
  const [editingProfile, setEditingProfile] = useState(false);
  const [editForm, setEditForm] = useState<{ name: string; email: string }>({ name: '', email: '' });

  useEffect(() => {
    if (typeof window !== "undefined") {
      const isLoggedIn = localStorage.getItem("isLoggedIn");
      if (isLoggedIn !== "true") {
        router.replace("/login");
      } else {
        const userData = localStorage.getItem("user");
        if (userData) {
          setUser(JSON.parse(userData));
        }
      }
    }
    // Fetch total users
    async function fetchTotalUsers() {
      try {
        const { collection, getDocs } = await import("firebase/firestore");
        const { db } = await import("@/lib/firebase");
        const usersCol = collection(db, "users");
        const usersSnapshot = await getDocs(usersCol);
        setTotalUsers(usersSnapshot.size);
      } catch (err) {
        setTotalUsers(null);
      }
    }
    // Fetch reminders stats
    async function fetchReminderStats() {
      try {
        const { collection, getDocs, query, where, Timestamp } = await import("firebase/firestore");
        const { db } = await import("@/lib/firebase");
        const remindersCol = collection(db, "reminders");
        // Get start and end of today
        const now = new Date();
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
        const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
        const startTimestamp = Timestamp.fromDate(startOfDay);
        const endTimestamp = Timestamp.fromDate(endOfDay);
        // Query reminders created today
        const remindersQuery = query(
          remindersCol,
          where("createdAt", ">=", startTimestamp),
          where("createdAt", "<=", endTimestamp)
        );
        const remindersSnapshot = await getDocs(remindersQuery);
        let drink = 0;
        let notDrink = 0;
        remindersSnapshot.forEach(doc => {
          const data = doc.data();
          if (data.isDrink === true) drink++;
          else if (data.isDrink === false) notDrink++;
        });
        setReminderStats({ drink, notDrink });
      } catch (err) {
        setReminderStats(null);
      }
    }
    // Fetch reminders stats for week
    async function fetchReminderStatsWeek() {
      try {
        const { collection, getDocs, query, where, Timestamp } = await import("firebase/firestore");
        const { db } = await import("@/lib/firebase");
        const remindersCol = collection(db, "reminders");
        // Get start and end of current week (Monday to Sunday)
        const now = new Date();
        const day = now.getDay();
        const diffToMonday = (day === 0 ? -6 : 1) - day; // Sunday is 0
        const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diffToMonday, 0, 0, 0, 0);
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        endOfWeek.setHours(23, 59, 59, 999);
        const startTimestamp = Timestamp.fromDate(startOfWeek);
        const endTimestamp = Timestamp.fromDate(endOfWeek);
        const remindersQuery = query(
          remindersCol,
          where("createdAt", ">=", startTimestamp),
          where("createdAt", "<=", endTimestamp)
        );
        const remindersSnapshot = await getDocs(remindersQuery);
        let drink = 0;
        let notDrink = 0;
        remindersSnapshot.forEach(doc => {
          const data = doc.data();
          if (data.isDrink === true) drink++;
          else if (data.isDrink === false) notDrink++;
        });
        setReminderStatsWeek({ drink, notDrink });
      } catch (err) {
        setReminderStatsWeek(null);
      }
    }
    // Fetch reminders stats for month
    async function fetchReminderStatsMonth() {
      try {
        const { collection, getDocs, query, where, Timestamp } = await import("firebase/firestore");
        const { db } = await import("@/lib/firebase");
        const remindersCol = collection(db, "reminders");
        // Get start and end of current month
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
        const startTimestamp = Timestamp.fromDate(startOfMonth);
        const endTimestamp = Timestamp.fromDate(endOfMonth);
        const remindersQuery = query(
          remindersCol,
          where("createdAt", ">=", startTimestamp),
          where("createdAt", "<=", endTimestamp)
        );
        const remindersSnapshot = await getDocs(remindersQuery);
        let drink = 0;
        let notDrink = 0;
        remindersSnapshot.forEach(doc => {
          const data = doc.data();
          if (data.isDrink === true) drink++;
          else if (data.isDrink === false) notDrink++;
        });
        setReminderStatsMonth({ drink, notDrink });
      } catch (err) {
        setReminderStatsMonth(null);
      }
    }
    fetchTotalUsers();
    fetchReminderStats();
    fetchReminderStatsWeek();
    fetchReminderStatsMonth();
  }, [router]);

  const handleLogout = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("isLoggedIn");
      localStorage.removeItem("user");
      router.replace("/login");
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-100">
      {/* Sidebar */}
      <aside className={`transition-all duration-200 bg-white shadow-md flex flex-col p-6 ${sidebarOpen ? 'w-64' : 'w-24'} overflow-hidden`}>
        <div className={`mb-8 flex items-center ${!sidebarOpen ? 'justify-center' : 'justify-between'}`}>
          <div className="text-lg font-bold flex-1">{sidebarOpen ? 'BNYU' : <span className="flex items-center justify-center w-full">🛠️</span>}</div>
          {sidebarOpen && (
            <button
              onClick={() => setSidebarOpen((open) => !open)}
              className="p-2 rounded hover:bg-gray-200 ml-2"
              aria-label={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
            >
              <ArrowLeftCircle size={22} />
            </button>
          )}
        </div>
        <nav className="flex-1">
          <ul className="space-y-2">
            <li>
              <button className="w-full flex items-center gap-2 text-left px-2 py-2 rounded hover:bg-gray-200 font-medium" onClick={() => setActivePage('dashboard')}>
                <LayoutDashboard size={22} />
                {sidebarOpen && 'Dashboard'}
              </button>
            </li>
            <li>
              <button className="w-full flex items-center gap-2 text-left px-2 py-2 rounded hover:bg-gray-200 font-medium" onClick={() => setActivePage('users')}>
                <UsersIcon size={22} />
                {sidebarOpen && 'Users'}
              </button>
            </li>
            <li>
              <button className="w-full flex items-center gap-2 text-left px-2 py-2 rounded hover:bg-gray-200 font-medium" onClick={() => setActivePage('profile')}>
                <User size={22} />
                {sidebarOpen && 'Profile'}
              </button>
            </li>
            {!sidebarOpen && (
              <li>
                <button
                  onClick={() => setSidebarOpen((open) => !open)}
                  className="w-full flex items-center gap-2 text-left px-2 py-2 rounded hover:bg-gray-200 font-medium">
                  <ArrowRightCircle size={22} />
                </button>
              </li>
            )}
          </ul>
        </nav>
        <button
          onClick={handleLogout}
          className={`mt-8 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 font-semibold flex gap-4`}
        >
          <LogOutIcon size={22} />
          {sidebarOpen && 'Logout'}
        </button>
      </aside>
      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center w-full h-full p-8">
        <div className="w-full max-w-3xl">
          {activePage === 'dashboard' && (
            <>
              {/* Welcome Card */}
              <div className="bg-white p-6 rounded-lg shadow flex items-center gap-6 mb-8">
                <div className="flex-shrink-0 h-16 w-16 rounded-full bg-blue-100 flex items-center justify-center text-2xl font-bold text-blue-600">
                  {user?.name ? user.name.charAt(0).toUpperCase() : "A"}
                </div>
                <div>
                  <h2 className="text-xl font-semibold">Welcome, {user?.name || "Admin"}!</h2>
                  <p className="text-gray-500 text-sm">{user?.email}</p>
                </div>
              </div>
              {/* Quick Stats */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-6 mb-8">
                <div className="bg-blue-50 p-4 rounded-lg shadow flex flex-col items-center">
                  <div className="text-2xl font-bold text-blue-600 mb-1">{totalUsers !== null ? totalUsers : '--'}</div>
                  <div className="text-gray-700">Total Users</div>
                </div>
                <div className="bg-green-50 p-4 rounded-lg shadow flex flex-col items-center">
                  <div className="text-2xl font-bold text-green-600 mb-1">
                    {reminderStats ? `${reminderStats.drink}/${reminderStats.notDrink}` : '--'}
                  </div>
                  <div className="text-gray-700">Active Reminders Today</div>
                </div>
                <div className="bg-yellow-50 p-4 rounded-lg shadow flex flex-col items-center">
                  <div className="text-2xl font-bold text-yellow-600 mb-1">
                    {reminderStatsWeek ? `${reminderStatsWeek.drink}/${reminderStatsWeek.notDrink}` : '--'}
                  </div>
                  <div className="text-gray-700">Active Reminders This Week</div>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg shadow flex flex-col items-center">
                  <div className="text-2xl font-bold text-purple-600 mb-1">
                    {reminderStatsMonth ? `${reminderStatsMonth.drink}/${reminderStatsMonth.notDrink}` : '--'}
                  </div>
                  <div className="text-gray-700">Active Reminders This Month</div>
                </div>
              </div>
              {/* Recent Activity */}
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-lg font-semibold mb-4">Recent Activity</h3>
                <ul className="text-gray-500 text-sm space-y-2">
                  <li>No recent activity yet.</li>
                </ul>
              </div>
            </>
          )}
          {activePage === 'users' && <UsersTable />}
          {activePage === 'profile' && user && (
            <ProfileCard user={user} setUser={setUser} />
          )}
        </div>
      </main>
    </div>
  );
}
