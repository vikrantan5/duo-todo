"use client";
import { Flame, Sun, Star, Heart } from "lucide-react";

const items = [
  { name: "7-Day Streak", icon: Flame, unlocked: true, color: "#F6BD60" },
  { name: "Early Bird", icon: Sun, unlocked: true, color: "#43D9A3" },
  { name: "Perfect Week", icon: Star, unlocked: false, color: "#8B7CFF" },
  { name: "Comeback Kid", icon: Heart, unlocked: false, color: "#FF6B7A" },
];

export default function Achievements() {
  return (
    <div className="card p-5">
      <div className="font-semibold mb-4">Achievements</div>
      <div className="grid grid-cols-4 gap-3">
        {items.map(({ name, icon: Icon, unlocked, color }) => (
          <div key={name} className="text-center">
            <div className="h-14 w-14 mx-auto rounded-full grid place-items-center border"
              style={{ background: unlocked ? `${color}22` : "transparent", borderColor: unlocked ? `${color}66` : "var(--border)", color: unlocked ? color : "var(--ink-muted)" }}>
              <Icon size={22} />
            </div>
            <div className="text-xs mt-2">{name}</div>
            <div className="text-[10px] muted">{unlocked ? "Unlocked" : "Locked"}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
