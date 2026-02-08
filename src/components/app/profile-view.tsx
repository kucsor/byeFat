'use client';

import { useFirebase } from '@/firebase';
import { signOut } from 'firebase/auth';
import {
  ArrowLeft, Settings, BadgeCheck, TrendingDown, TrendingUp,
  RefreshCw, Download, MessageCircle, User, Watch, Bell,
  Gem, SlidersHorizontal, ChevronRight, LogOut
} from 'lucide-react';
import Link from 'next/link';
import { BottomNav } from './bottom-nav';

export function ProfileView() {
  const { user, userProfile, auth } = useFirebase();

  // Helper for glass styles
  const GLASS_PANEL = "backdrop-blur-md bg-white/60 dark:bg-white/5 border border-white/40 dark:border-white/10 shadow-sm";

  return (
    <div className="relative flex h-full min-h-screen w-full flex-col overflow-x-hidden bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-50 via-[#f6f7f8] to-[#f6f7f8] dark:from-blue-900/10 dark:via-[#101922] dark:to-[#101922] text-[#111418] dark:text-white font-sans antialiased selection:bg-[#2b8cee]/20 pb-32">

      {/* Header */}
      <header className={`sticky top-0 z-40 flex items-center justify-between p-4 pb-2 ${GLASS_PANEL} !bg-white/80 dark:!bg-[#101922]/80 !border-b`}>
        <Link href="/" className="flex size-12 shrink-0 items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer text-[#111418] dark:text-white">
          <ArrowLeft className="w-6 h-6" />
        </Link>
        <h2 className="text-lg font-semibold tracking-tight">Profile</h2>
        <div className="flex size-12 items-center justify-center">
          <button className="flex items-center justify-center rounded-full size-10 hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-[#111418] dark:text-white">
            <Settings className="w-6 h-6" />
          </button>
        </div>
      </header>

      <main className="flex-1">

        {/* Profile Hero */}
        <section className="flex flex-col items-center gap-6 pt-8 pb-6 px-4">
          <div className="relative group">
            <div className="absolute -inset-1 rounded-full bg-gradient-to-tr from-[#2b8cee] to-blue-300 opacity-70 blur-md group-hover:opacity-100 transition duration-500 animate-pulse"></div>
            <div className="relative size-32 rounded-full p-[3px] bg-white dark:bg-[#101922] shadow-[0_0_20px_-5px_rgba(43,140,238,0.5)]">
              {user?.photoURL ? (
                <div
                  className="h-full w-full rounded-full bg-center bg-cover bg-no-repeat"
                  style={{ backgroundImage: `url("${user.photoURL}")` }}
                ></div>
              ) : (
                <div className="h-full w-full rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-400">
                  <User className="w-12 h-12" />
                </div>
              )}
            </div>
            <div className="absolute bottom-1 right-1 flex h-8 w-8 items-center justify-center rounded-full bg-[#2b8cee] text-white shadow-lg border-2 border-white dark:border-[#101922]">
              <BadgeCheck className="w-4 h-4" />
            </div>
          </div>

          <div className="flex flex-col items-center text-center">
            <h1 className="text-2xl font-bold tracking-tight text-[#111418] dark:text-white">{userProfile?.name || 'User'}</h1>
            <div className="flex items-center gap-2 mt-1">
              <span className="px-2 py-0.5 rounded-full bg-[#2b8cee]/10 text-[#2b8cee] text-xs font-semibold tracking-wide uppercase border border-[#2b8cee]/20">Premium</span>
              <span className="text-sm text-gray-500 dark:text-gray-400">Member since {new Date().getFullYear()}</span>
            </div>
          </div>
        </section>

        {/* Quick Stats Row */}
        <section className="flex flex-wrap gap-3 px-4 mb-8">
          <div className={`flex-1 min-w-[100px] p-4 rounded-2xl ${GLASS_PANEL} flex flex-col items-center justify-center gap-1 group hover:border-[#2b8cee]/30 transition-all`}>
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Weight</span>
            <span className="text-xl font-bold text-[#111418] dark:text-white group-hover:text-[#2b8cee] transition-colors">
              {userProfile?.weight || '--'} <span className="text-sm font-normal text-gray-400">lbs</span>
            </span>
            <span className="text-xs font-medium text-green-500 flex items-center gap-0.5">
              <TrendingDown className="w-3 h-3" /> 1.2%
            </span>
          </div>

          <div className={`flex-1 min-w-[100px] p-4 rounded-2xl ${GLASS_PANEL} flex flex-col items-center justify-center gap-1 group hover:border-[#2b8cee]/30 transition-all`}>
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Goal</span>
            <span className="text-xl font-bold text-[#111418] dark:text-white group-hover:text-[#2b8cee] transition-colors">
              155 <span className="text-sm font-normal text-gray-400">lbs</span>
            </span>
            <span className="text-xs font-medium text-gray-400">-</span>
          </div>

          <div className={`flex-1 min-w-[100px] p-4 rounded-2xl ${GLASS_PANEL} flex flex-col items-center justify-center gap-1 group hover:border-[#2b8cee]/30 transition-all`}>
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Body Fat</span>
            <span className="text-xl font-bold text-[#111418] dark:text-white group-hover:text-[#2b8cee] transition-colors">
              14 <span className="text-sm font-normal text-gray-400">%</span>
            </span>
            <span className="text-xs font-medium text-green-500 flex items-center gap-0.5">
              <TrendingDown className="w-3 h-3" /> 0.5%
            </span>
          </div>
        </section>

        {/* Main Chart Section */}
        <section className="px-4 mb-8">
          <div className="rounded-3xl bg-white/80 dark:bg-white/5 border border-white/50 dark:border-white/10 p-6 shadow-sm backdrop-blur-md relative overflow-hidden">
            {/* Decor background glow */}
            <div className="absolute -top-20 -right-20 w-64 h-64 bg-[#2b8cee]/5 rounded-full blur-3xl pointer-events-none"></div>

            <div className="flex justify-between items-start mb-6 relative z-10">
              <div>
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Metabolic Trend</h3>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-[#111418] dark:text-white tracking-tight">-350</span>
                  <span className="text-sm font-medium text-gray-500 dark:text-gray-400">kcal avg</span>
                </div>
              </div>
              <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-green-500/10 border border-green-500/20 text-green-600 dark:text-green-400 text-xs font-medium">
                <TrendingUp className="w-4 h-4" />
                <span>+2% vs last week</span>
              </div>
            </div>

            {/* Chart Visual (SVG) */}
            <div className="relative h-40 w-full mb-4">
              <svg className="w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 100 50">
                <defs>
                  <linearGradient id="chartGradient" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="#2b8cee" stopOpacity="0.2"></stop>
                    <stop offset="100%" stopColor="#2b8cee" stopOpacity="0"></stop>
                  </linearGradient>
                </defs>
                {/* Grid lines */}
                <line className="text-gray-200 dark:text-white/5" stroke="currentColor" strokeDasharray="2,2" strokeWidth="0.5" x1="0" x2="100" y1="10" y2="10"></line>
                <line className="text-gray-200 dark:text-white/5" stroke="currentColor" strokeDasharray="2,2" strokeWidth="0.5" x1="0" x2="100" y1="25" y2="25"></line>
                <line className="text-gray-200 dark:text-white/5" stroke="currentColor" strokeDasharray="2,2" strokeWidth="0.5" x1="0" x2="100" y1="40" y2="40"></line>
                {/* Area under curve */}
                <path d="M0,45 L0,35 C10,35 10,20 25,20 C40,20 40,30 55,25 C70,20 70,10 85,15 C95,18 100,5 100,5 L100,45 Z" fill="url(#chartGradient)"></path>
                {/* Line */}
                <path d="M0,35 C10,35 10,20 25,20 C40,20 40,30 55,25 C70,20 70,10 85,15 C95,18 100,5 100,5" fill="none" stroke="#2b8cee" strokeLinecap="round" strokeWidth="1.5" vectorEffect="non-scaling-stroke"></path>
                {/* Data Point */}
                <circle cx="100" cy="5" r="2" fill="#2b8cee" stroke="white" strokeWidth="1" className="dark:stroke-[#101922] shadow-md"></circle>
              </svg>
            </div>

            <div className="flex justify-between text-xs text-gray-400 dark:text-gray-500 font-medium px-1">
              <span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span>
            </div>
          </div>
        </section>

        {/* Quick Actions */}
        <section className="mb-10">
          <div className="flex justify-center gap-6 px-4">
            <button className="flex flex-col items-center gap-3 group">
              <div className="size-14 rounded-full bg-white dark:bg-white/10 border border-gray-100 dark:border-white/10 flex items-center justify-center text-[#111418] dark:text-white shadow-sm group-hover:border-[#2b8cee]/50 group-hover:text-[#2b8cee] transition-all duration-300 group-hover:shadow-[0_0_30px_-5px_rgba(43,140,238,0.7)]">
                <RefreshCw className="w-6 h-6" />
              </div>
              <span className="text-xs font-medium text-gray-600 dark:text-gray-400 group-hover:text-[#2b8cee] transition-colors">Sync Device</span>
            </button>
            <button className="flex flex-col items-center gap-3 group">
              <div className="size-14 rounded-full bg-white dark:bg-white/10 border border-gray-100 dark:border-white/10 flex items-center justify-center text-[#111418] dark:text-white shadow-sm group-hover:border-[#2b8cee]/50 group-hover:text-[#2b8cee] transition-all duration-300 group-hover:shadow-[0_0_30px_-5px_rgba(43,140,238,0.7)]">
                <Download className="w-6 h-6" />
              </div>
              <span className="text-xs font-medium text-gray-600 dark:text-gray-400 group-hover:text-[#2b8cee] transition-colors">Export Data</span>
            </button>
            <button className="flex flex-col items-center gap-3 group">
              <div className="size-14 rounded-full bg-white dark:bg-white/10 border border-gray-100 dark:border-white/10 flex items-center justify-center text-[#111418] dark:text-white shadow-sm group-hover:border-[#2b8cee]/50 group-hover:text-[#2b8cee] transition-all duration-300 group-hover:shadow-[0_0_30px_-5px_rgba(43,140,238,0.7)]">
                <MessageCircle className="w-6 h-6" />
              </div>
              <span className="text-xs font-medium text-gray-600 dark:text-gray-400 group-hover:text-[#2b8cee] transition-colors">Concierge</span>
            </button>
          </div>
        </section>

        {/* Settings Lists */}
        <section className="px-4 space-y-6">
          {/* Group 1 */}
          <div>
            <h4 className="px-2 mb-2 text-xs font-semibold text-gray-400 uppercase tracking-widest">Preferences</h4>
            <div className="rounded-2xl bg-white dark:bg-white/5 overflow-hidden border border-gray-100 dark:border-white/5 shadow-sm">
              <div className="flex items-center justify-between p-4 border-b border-gray-50 dark:border-white/5 hover:bg-gray-50 dark:hover:bg-white/5 cursor-pointer transition-colors group">
                <div className="flex items-center gap-4">
                  <div className="size-10 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-[#2b8cee]">
                    <User className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[#111418] dark:text-white">Biometrics & Goals</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Manage weight, height, age</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-[#2b8cee] group-hover:translate-x-1 transition-all" />
              </div>
              <div className="flex items-center justify-between p-4 border-b border-gray-50 dark:border-white/5 hover:bg-gray-50 dark:hover:bg-white/5 cursor-pointer transition-colors group">
                <div className="flex items-center gap-4">
                  <div className="size-10 rounded-full bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center text-purple-600 dark:text-purple-400">
                    <Watch className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[#111418] dark:text-white">Connected Devices</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Apple Health, Oura, Garmin</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-[#2b8cee] group-hover:translate-x-1 transition-all" />
              </div>
              <div className="flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-white/5 cursor-pointer transition-colors group">
                <div className="flex items-center gap-4">
                  <div className="size-10 rounded-full bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center text-orange-600 dark:text-orange-400">
                    <Bell className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[#111418] dark:text-white">Notifications</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Reminders & Alerts</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-[#2b8cee] group-hover:translate-x-1 transition-all" />
              </div>
            </div>
          </div>

          {/* Group 2 */}
          <div>
            <h4 className="px-2 mb-2 text-xs font-semibold text-gray-400 uppercase tracking-widest">Support</h4>
            <div className="rounded-2xl bg-white dark:bg-white/5 overflow-hidden border border-gray-100 dark:border-white/5 shadow-sm">
              <div className="flex items-center justify-between p-4 border-b border-gray-50 dark:border-white/5 hover:bg-gray-50 dark:hover:bg-white/5 cursor-pointer transition-colors group">
                <div className="flex items-center gap-4">
                  <div className="size-10 rounded-full bg-green-50 dark:bg-green-900/20 flex items-center justify-center text-green-600 dark:text-green-400">
                    <Gem className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[#111418] dark:text-white">Concierge Settings</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Customize your assistant</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-[#2b8cee] group-hover:translate-x-1 transition-all" />
              </div>
              <div className="flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-white/5 cursor-pointer transition-colors group">
                <div className="flex items-center gap-4">
                  <div className="size-10 rounded-full bg-gray-50 dark:bg-gray-800 flex items-center justify-center text-gray-600 dark:text-gray-300">
                    <SlidersHorizontal className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[#111418] dark:text-white">App Preferences</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Theme, Units, Language</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-[#2b8cee] group-hover:translate-x-1 transition-all" />
              </div>
            </div>
          </div>

          <div className="flex justify-center py-4">
            <button onClick={() => auth && signOut(auth)} className="flex items-center gap-2 text-sm font-medium text-red-500 hover:text-red-600 transition-colors">
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>
        </section>

      </main>

      <BottomNav />
    </div>
  );
}
