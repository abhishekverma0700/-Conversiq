import React, { useEffect } from "react";
import { AlertCircle, CheckCircle, Sparkles, X } from "lucide-react";
import { motion } from "motion/react";

export default function Toast({
  message,
  type,
  onClose,
}: {
  message: string;
  type: "success" | "error" | "info";
  onClose: () => void;
}) {
  useEffect(() => {
    const t = setTimeout(onClose, 3000);
    return () => clearTimeout(t);
  }, [onClose]);

  const colors = {
    success: "bg-[#10B981] text-white",
    error: "bg-[#EF4444] text-white",
    info: "bg-[#7A1F2B] text-white",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 50, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 50 }}
      className={`fixed bottom-6 right-6 z-[100] flex items-center gap-2 px-4 py-3 rounded-2xl shadow-lg text-[13px] font-medium ${colors[type]}`}
    >
      {type === "success" && <CheckCircle className="w-4 h-4" />}
      {type === "error" && <AlertCircle className="w-4 h-4" />}
      {type === "info" && <Sparkles className="w-4 h-4" />}
      {message}
      <button onClick={onClose} className="ml-1 opacity-70 hover:opacity-100">
        <X className="w-3 h-3" />
      </button>
    </motion.div>
  );
}
