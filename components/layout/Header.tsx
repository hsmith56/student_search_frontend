"use client";

import { GraduationCap, Users, LogOut } from "lucide-react";
import React from "react";

interface HeaderProps {
  firstName: string;
  onLogout: () => void;
}

export default function Header({ firstName, onLogout }: HeaderProps) {
  return (
    <header className="bg-white/80 backdrop-blur-xl border-b border-slate-200/60 shadow-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="bg-gradient-to-br from-blue-600 via-blue-600 to-indigo-600 p-2 rounded-xl shadow-lg shadow-blue-600/20">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900 tracking-tight">
                Student Exchange Portal
              </h1>
              <p className="text-[11px] text-slate-500 font-medium">
                Find your perfect match
              </p>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
            <a className="hover:text-blue-600 transition-colors duration-200 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5" />
              Hello, {firstName}!
            </a>
            {/* <a href="#" className="hover:text-blue-600 transition-colors duration-200 flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5" />
                  Programs
                </a>
                <a href="#" className="hover:text-blue-600 transition-colors duration-200">
                  About
                </a>
                <a href="#" className="hover:text-blue-600 transition-colors duration-200">
                  Contact
                </a> */}
            <button
              onClick={onLogout}
              className="hover:text-red-600 transition-colors duration-200 flex items-center gap-1.5"
            >
              <LogOut className="w-3.5 h-3.5" />
              Logout
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
