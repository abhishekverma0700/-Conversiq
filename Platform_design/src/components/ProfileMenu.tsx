import React from "react";
import { LogIn, UserPlus, UserRound } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import type { User } from "@supabase/supabase-js";
import { getUserDisplayName } from "./utils";

export default function ProfileMenu({
  user,
  isOpen,
  onToggle,
  onLogin,
  onRegister,
  onLogout,
  onClose,
}: {
  user: User | null;
  isOpen: boolean;
  onToggle: () => void;
  onLogin: () => void;
  onRegister: () => void;
  onLogout: () => void;
  onClose: () => void;
}) {
  const isAuthenticated = Boolean(user);
  const displayName = getUserDisplayName(user);
  const displayEmail = user?.email ?? "";

  return (
    <div className="relative">
      <motion.button
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.96 }}
        onClick={onToggle}
        className="flex h-10 w-10 items-center justify-center rounded-full border border-[#E5E7EB] bg-white text-[#64748B] shadow-[0_1px_4px_rgba(15,23,42,0.04)] transition-all hover:border-[#CFCFF7] hover:text-[#101827]"
      >
        <UserRound className="h-4.5 w-4.5" />
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.16, ease: "easeOut" }}
            className="absolute right-0 top-12 z-50 w-72 overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white shadow-[0_18px_40px_rgba(15,23,42,0.12)]"
          >
            <div className="border-b border-[#F3F4F6] px-4 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-[#7A1F2B] to-[#C8A96A] text-white shadow-sm">
                  <UserRound className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#94A3B8]">
                    {isAuthenticated ? "Signed in" : "Account"}
                  </div>
                  <div className="mt-1 truncate text-[14px] font-semibold text-[#101827]">
                    {isAuthenticated ? displayName : "Guest"}
                  </div>
                  <div className="truncate text-[12px] text-[#6B7280]">
                    {isAuthenticated ? displayEmail : "Sign in to continue"}
                  </div>
                </div>
              </div>
            </div>
            <div className="p-2">
              {isAuthenticated ? (
                <>
                  <button
                    onClick={onClose}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[13px] font-medium text-[#101827] transition-colors hover:bg-[#FBF7F6]"
                  >
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#F7E9EB] text-[#7A1F2B]">
                      <UserRound className="h-4 w-4" />
                    </span>
                    <span>Account</span>
                  </button>
                  <button
                    onClick={onLogout}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[13px] font-medium text-[#101827] transition-colors hover:bg-[#FBF7F6]"
                  >
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#FEE2E2] text-[#EF4444]">
                      <LogIn className="h-4 w-4" />
                    </span>
                    <span>Logout</span>
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={onLogin}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[13px] font-medium text-[#101827] transition-colors hover:bg-[#FBF7F6]"
                  >
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#F7E9EB] text-[#7A1F2B]">
                      <LogIn className="h-4 w-4" />
                    </span>
                    <span>Login</span>
                  </button>
                  <button
                    onClick={onRegister}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[13px] font-medium text-[#101827] transition-colors hover:bg-[#FBF7F6]"
                  >
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#E6FBF7] text-[#00A88B]">
                      <UserPlus className="h-4 w-4" />
                    </span>
                    <span>Register</span>
                  </button>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
