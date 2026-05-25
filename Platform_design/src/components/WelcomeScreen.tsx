import React from "react";
import { motion } from "motion/react";
import { Plus } from "lucide-react";

const aiHeroAnimation = new URL(
  "../../assests/Artificial_Intelligence.svg",
  import.meta.url
).href;

const welcomeHighlights = [
  {
    title: "Persistent memory",
    description:
      "Retain context, entities, and relationships across conversations.",
  },
  {
    title: "Knowledge graph",
    description: "See how people, projects, and concepts connect in real time.",
  },
  {
    title: "Fast retrieval",
    description:
      "Surface the most relevant memories without cluttering the chat.",
  },
  {
    title: "Polished workflows",
    description:
      "Move between chat, graph, personas, and analytics seamlessly.",
  },
];

export default function WelcomeScreen({
  onNewConversation,
}: {
  onNewConversation: () => void;
}) {
  return (
    <div className="h-full min-h-0 relative overflow-y-auto px-4 py-6 sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute inset-0">
        <motion.div
          className="absolute -top-32 left-[-10%] h-[28rem] w-[28rem] rounded-full opacity-[0.08] blur-3xl"
          style={{
            background:
              "radial-gradient(circle, rgba(108,99,255,0.9) 0%, transparent 65%)",
          }}
          animate={{ scale: [1, 1.08, 1], x: [0, 20, 0], y: [0, -16, 0] }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute -bottom-24 right-[-10%] h-[26rem] w-[26rem] rounded-full opacity-[0.08] blur-3xl"
          style={{
            background:
              "radial-gradient(circle, rgba(0,212,170,0.9) 0%, transparent 65%)",
          }}
          animate={{ scale: [1, 1.12, 1], x: [0, -20, 0], y: [0, 18, 0] }}
          transition={{
            duration: 14,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 3,
          }}
        />
      </div>

      <div className="relative mx-auto flex min-h-full w-full max-w-6xl items-center py-6">
        <div className="grid w-full grid-cols-1 items-center gap-8 lg:grid-cols-[1.08fr_0.92fr]">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="space-y-6"
          >
            <div className="space-y-5">
              <h1
                className="max-w-xl text-5xl tracking-wide sm:text-6xl lg:text-7xl bg-gradient-to-r from-red-800 via-red-1200 to-red-400 bg-clip-text text-transparent"
                style={{ fontFamily: "'Dancing Script', cursive" }}
              >
                ConversiQ
              </h1>
              <p className="max-w-2xl text-[15px] leading-7 text-[#5B6474] sm:text-[16px]">
                AI Chatbot Platform with Persistent Memory
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={onNewConversation}
                className="inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-[14px] font-semibold text-white shadow-[0_10px_24px_rgba(122,31,43,0.22)] transition-transform duration-200 hover:scale-[1.01]"
                style={{
                  background: "linear-gradient(135deg, #7A1F2B 0%, #C8A96A 100%)",
                }}
              >
                <Plus className="h-4 w-4" />
                Start Conversation
              </motion.button>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { label: "Memory modes", value: "5" },
                { label: "Contexts tracked", value: "∞" },
                { label: "Graph links", value: "Live" },
                { label: "Response feel", value: "Premium" },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-2xl border border-[#E5E7EB] bg-white/85 px-4 py-3 shadow-[0_4px_16px_rgba(15,23,42,0.04)] backdrop-blur"
                >
                  <div className="text-[11px] uppercase tracking-wide text-[#8A94A6]">
                    {stat.label}
                  </div>
                  <div className="mt-1 text-[16px] font-semibold text-[#101827]">
                    {stat.value}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: "easeOut", delay: 0.05 }}
            className="relative"
          >
            <div className="space-y-5">
              <div className="flex justify-center">
                <img
                  src={aiHeroAnimation}
                  alt="AI illustration"
                  className="h-auto w-full max-w-[290px] select-none object-contain"
                  loading="eager"
                  decoding="async"
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {welcomeHighlights.map((item, index) => (
                  <motion.div
                    key={item.title}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35, delay: 0.12 + index * 0.06 }}
                    className="rounded-2xl border border-transparent bg-transparent p-4"
                  >
                    <div className="text-[13px] font-semibold text-[#101827]">
                      {item.title}
                    </div>
                    <p className="mt-1.5 text-[12px] leading-6 text-[#5B6474]">
                      {item.description}
                    </p>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
