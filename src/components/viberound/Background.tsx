import { motion } from "framer-motion";

export function FloatingBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <motion.div
        className="absolute -left-32 top-10 h-96 w-96 rounded-full"
        style={{ background: "radial-gradient(circle, oklch(0.72 0.22 12 / 0.35), transparent 70%)" }}
        animate={{ y: [0, 30, 0], x: [0, 20, 0] }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute right-0 top-1/3 h-[28rem] w-[28rem] rounded-full"
        style={{ background: "radial-gradient(circle, oklch(0.70 0.24 330 / 0.30), transparent 70%)" }}
        animate={{ y: [0, -40, 0], x: [0, -20, 0] }}
        transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute -bottom-20 left-1/3 h-96 w-96 rounded-full"
        style={{ background: "radial-gradient(circle, oklch(0.78 0.18 200 / 0.25), transparent 70%)" }}
        animate={{ y: [0, -30, 0] }}
        transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }}
      />
      <div className="absolute inset-0" style={{
        backgroundImage: "radial-gradient(oklch(1 0 0 / 0.04) 1px, transparent 1px)",
        backgroundSize: "32px 32px",
        maskImage: "radial-gradient(ellipse at center, black 30%, transparent 75%)",
      }} />
    </div>
  );
}
