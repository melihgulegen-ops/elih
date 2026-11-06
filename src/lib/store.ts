import { useEffect, useState } from "react";

export type Priority = "Düşük" | "Orta" | "Yüksek";
export type TaskStatus = "Planlandı" | "Tamamlandı";
export interface Task {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  time: string;
  priority: Priority;
  plan: string;
  status: TaskStatus;
}
export type EntryKind = "yatan" | "iade" | "malzeme";
export interface Entry {
  id: string;
  kind: EntryKind;
  name: string;
  date: string;
  person: string;
  amount: number;
  material?: string;
  place?: string;
  qty?: string;
}
export interface Note {
  id: string;
  title: string;
  body: string;
  date: string;
}

export const KIND_LABEL: Record<EntryKind, string> = {
  yatan: "Yatan",
  iade: "İade",
  malzeme: "Alınan Malzemeler",
};

export const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);
export const today = () => new Date().toISOString().slice(0, 10);
export const monthOf = (d: string) => (d || "").slice(0, 7);
export const tl = (n: number) =>
  new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" }).format(n || 0);
export const fmtDate = (d: string) => {
  if (!d) return "-";
  const [y, m, day] = d.split("-");
  return `${day ?? "01"}.${m}.${y}`;
};
const AYLAR = ["Ocak","Şubat","Mart","Nisan","Mayıs","Haziran","Temmuz","Ağustos","Eylül","Ekim","Kasım","Aralık"];
export const fmtMonth = (ym: string) => {
  const [y, m] = ym.split("-");
  return `${AYLAR[Number(m) - 1] ?? ""} ${y}`;
};

export function useLocal<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(initial);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw) setValue(JSON.parse(raw));
    } catch {}
    setReady(true);
  }, [key]);
  useEffect(() => {
    if (ready) localStorage.setItem(key, JSON.stringify(value));
  }, [key, value, ready]);
  return [value, setValue] as const;
}

export const signed = (e: Entry) => (e.kind === "malzeme" ? -e.amount : e.amount);

export function balances(entries: Entry[], nowMonth = monthOf(today())) {
  let carry = 0, thisMonth = 0, spent = 0;
  for (const e of entries) {
    if (e.kind === "malzeme") spent += e.amount;
    if (monthOf(e.date) < nowMonth) carry += signed(e);
    else if (monthOf(e.date) === nowMonth) thisMonth += signed(e);
  }
  const total = entries.reduce((s, e) => s + signed(e), 0);
  return { carry, thisMonth, total, spent };
}

export function monthly(entries: Entry[]) {
  const map = new Map<string, { yatan: number; iade: number; malzeme: number }>();
  for (const e of entries) {
    const m = monthOf(e.date);
    const r = map.get(m) ?? { yatan: 0, iade: 0, malzeme: 0 };
    r[e.kind] += e.amount;
    map.set(m, r);
  }
  let run = 0;
  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, r]) => {
      run += r.yatan + r.iade - r.malzeme;
      return { month, ...r, balance: run };
    });
}
