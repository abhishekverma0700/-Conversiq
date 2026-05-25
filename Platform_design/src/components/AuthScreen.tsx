import React, { useEffect, useState } from "react";
import { ArrowLeft, Eye, EyeOff, Lock, LogIn, Mail, UserPlus, UserRound } from "lucide-react";
import { motion } from "motion/react";
import type { AuthFormValues, AuthView } from "../types";

function AuthField({
  label,
  placeholder,
  type = "text",
  icon: Icon,
  value,
  onChange,
  rightSlot,
}: {
  label: string;
  placeholder: string;
  type?: string;
  icon: React.ElementType;
  value: string;
  onChange: (value: string) => void;
  rightSlot?: React.ReactNode;
}) {
  return (
    <label className="block space-y-2">
      <span className="text-[12px] font-medium text-[#475569]">{label}</span>
      <div className="relative">
        <Icon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94A3B8]" />
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          required
          className="w-full rounded-2xl border border-[#E5E7EB] bg-white py-3 pl-10 pr-12 text-[14px] text-[#101827] placeholder:text-[#94A3B8] shadow-[0_1px_4px_rgba(15,23,42,0.03)] transition-all focus:border-[#D8B7BC] focus:outline-none focus:ring-2 focus:ring-[#7A1F2B]/15"
        />
        {rightSlot}
      </div>
    </label>
  );
}

export default function AuthScreen({
  mode,
  onBack,
  onSwitchMode,
  onSubmit,
  authMessage,
}: {
  mode: AuthView;
  onBack: () => void;
  onSwitchMode: (mode: AuthView) => void;
  onSubmit: (form: AuthFormValues) => Promise<void> | void;
  authMessage: { text: string; type: "error" | "success" | "info" } | null;
}) {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [form, setForm] = useState<AuthFormValues>({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const isLogin = mode === "login";

  useEffect(() => {
    setShowPassword(false);
    setShowConfirmPassword(false);
  }, [mode]);

  const sharedCard =
    "rounded-[28px] border border-white/70 bg-white/90 shadow-[0_24px_60px_rgba(15,23,42,0.12)] backdrop-blur-xl";

  return (
    <div className="h-full overflow-y-auto px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-full w-full max-w-6xl items-center py-4">
        <div className="grid w-full gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: "easeOut" }}
            className="hidden items-center justify-center lg:flex"
          >
            <img
              src={new URL("../../assests/Artificial_Intelligence.svg", import.meta.url).href}
              alt="AI illustration"
              className="w-full max-w-[340px] select-none object-contain"
              loading="eager"
              decoding="async"
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: "easeOut", delay: 0.05 }}
            className={`${sharedCard} p-5 sm:p-6`}
          >
            <button
              type="button"
              onClick={onBack}
              className="inline-flex items-center gap-2 rounded-full border border-[#E5E7EB] bg-white px-3 py-2 text-[12px] font-medium text-[#475569] transition-all hover:bg-[#F8F9FF]"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to app
            </button>

            <div className="mt-5 space-y-2">
              <h2 className="text-2xl font-semibold tracking-tight text-[#101827]">
                {isLogin ? "Login" : "Create account"}
              </h2>
              <p className="text-[13px] leading-6 text-[#64748B]">
                {isLogin
                  ? "Enter your credentials to continue."
                  : "Create your account to start using the AI workspace."}
              </p>
            </div>

            <div className="mt-6 space-y-4">
              {!isLogin && (
                <AuthField
                  label="Full Name"
                  placeholder="Enter your full name"
                  icon={UserRound}
                  value={form.fullName}
                  onChange={(value) =>
                    setForm((prev) => ({ ...prev, fullName: value }))
                  }
                />
              )}
              <AuthField
                label="Email"
                placeholder="name@company.com"
                icon={Mail}
                value={form.email}
                onChange={(value) =>
                  setForm((prev) => ({ ...prev, email: value }))
                }
              />
              <AuthField
                label="Password"
                placeholder="Enter your password"
                icon={Lock}
                type={showPassword ? "text" : "password"}
                value={form.password}
                onChange={(value) =>
                  setForm((prev) => ({ ...prev, password: value }))
                }
                rightSlot={
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-[#94A3B8] transition-colors hover:bg-[#F8F9FF] hover:text-[#475569]"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                }
              />
              {!isLogin && (
                <AuthField
                  label="Confirm Password"
                  placeholder="Re-enter your password"
                  icon={Lock}
                  type={showConfirmPassword ? "text" : "password"}
                  value={form.confirmPassword}
                  onChange={(value) =>
                    setForm((prev) => ({ ...prev, confirmPassword: value }))
                  }
                  rightSlot={
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-[#94A3B8] transition-colors hover:bg-[#F8F9FF] hover:text-[#475569]"
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  }
                />
              )}
            </div>

            {authMessage && (
              <div
                className={`w-full px-4 py-3 rounded-xl text-sm font-medium text-center ${
                  authMessage.type === "error"
                    ? "bg-red-50 text-red-600 border border-red-200"
                    : authMessage.type === "success"
                    ? "bg-green-50 text-green-600 border border-green-200"
                    : "bg-blue-50 text-blue-600 border border-blue-200"
                }`}
              >
                {authMessage.text}
              </div>
            )}

            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={() => void onSubmit(form)}
              className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl px-5 py-3.5 text-[14px] font-semibold text-white shadow-[0_14px_28px_rgba(108,99,255,0.22)] transition-transform hover:scale-[1.01]"
              style={{
                background: "linear-gradient(135deg, #7A1F2B 0%, #C8A96A 100%)",
              }}
            >
              {isLogin ? (
                <LogIn className="h-4 w-4" />
              ) : (
                <UserPlus className="h-4 w-4" />
              )}
              {isLogin ? "Login" : "Create Account"}
            </motion.button>

            <div className="mt-5 text-center text-[13px] text-[#64748B]">
              {isLogin ? "Don't have an account?" : "Already have an account?"} {" "}
              <button
                type="button"
                onClick={() => onSwitchMode(isLogin ? "register" : "login")}
                className="font-semibold text-[#7A1F2B] transition-colors hover:text-[#6A1A23]"
              >
                {isLogin ? "Register" : "Login"}
              </button>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
