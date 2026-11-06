import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, type ReactNode } from "react";
import {
  balances, fmtDate, fmtMonth, KIND_LABEL, monthly, monthOf, tl, today, uid, useLocal,
  type Entry, type EntryKind, type Note, type Priority, type Task,
} from "@/lib/store";
import { downloadExcel, openPdf } from "@/lib/report";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "İstizan — Görev, İstizan ve Not Takibi" },
      { name: "description", content: "Görev, istizan (yatan, iade, malzeme) ve not takibi; ayrıntılı PDF/Excel raporları." },
      { property: "og:title", content: "İstizan — Görev, İstizan ve Not Takibi" },
      { property: "og:description", content: "Koyu ay yıldızlı temada görev, istizan ve not takibi." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: App,
});

type Tab = "genel" | "gorev" | "istizan" | "not";

function Crescent({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden>
      <path d="M38 8a24 24 0 1 0 0 48a19 19 0 1 1 0-48z" fill="currentColor" />
      <path d="M46 24l2.4 6.2 6.6.3-5.2 4.1 1.8 6.4-5.6-3.7-5.6 3.7 1.8-6.4-5.2-4.1 6.6-.3z" fill="currentColor" />
    </svg>
  );
}

function App() {
  const [tab, setTab] = useState<Tab>("genel");
  const [tasks, setTasks] = useLocal<Task[]>("istizan.tasks", []);
  const [entries, setEntries] = useLocal<Entry[]>("istizan.entries", []);
  const [notes, setNotes] = useLocal<Note[]>("istizan.notes", []);
  const [report, setReport] = useState(false);

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: "genel", label: "Genel", icon: "☾" },
    { id: "gorev", label: "Görevler", icon: "✓" },
    { id: "istizan", label: "İstizan", icon: "₺" },
    { id: "not", label: "Notlar", icon: "✎" },
  ];

  return (
    <div className="star-field min-h-screen pb-28">
      <header className="mx-auto flex max-w-3xl items-center justify-between px-4 pt-6">
        <div className="flex items-center gap-3">
          <Crescent className="h-10 w-10 text-gold drop-shadow-[0_0_12px_var(--gold)]" />
          <div>
            <h1 className="font-display text-2xl text-gold">İstizan</h1>
            <p className="text-xs text-muted-foreground">Görev · İstizan · Not</p>
          </div>
        </div>
        <button className="btn-gold" onClick={() => setReport(true)}>Özet Oluştur</button>
      </header>

      <main className="mx-auto max-w-3xl px-4 pt-6">
        {tab === "genel" && <Overview tasks={tasks} entries={entries} notes={notes} go={setTab} />}
        {tab === "gorev" && <Tasks tasks={tasks} setTasks={setTasks} />}
        {tab === "istizan" && <Istizan entries={entries} setEntries={setEntries} />}
        {tab === "not" && <Notes notes={notes} setNotes={setNotes} />}
        <footer className="mt-12 text-center text-xs text-muted-foreground">
          <Crescent className="mx-auto mb-1 h-5 w-5 text-gold" />
          Melih Gülegen · <span className="font-display tracking-[0.3em] text-gold">MGN</span>
        </footer>
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card/95 backdrop-blur">
        <div className="mx-auto grid max-w-3xl grid-cols-4">
          {tabs.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex flex-col items-center gap-0.5 py-3 text-xs ${tab === t.id ? "text-gold" : "text-muted-foreground"}`}>
              <span className="text-lg leading-none">{t.icon}</span>{t.label}
            </button>
          ))}
        </div>
      </nav>

      {report && <Report tasks={tasks} entries={entries} notes={notes} onClose={() => setReport(false)} />}
    </div>
  );
}

/* ---------- shared ---------- */
function Card({ children, className = "", onClick }: { children: ReactNode; className?: string; onClick?: () => void }) {
  return <div onClick={onClick} className={`card-glow rounded-xl border border-border bg-card p-4 ${className}`}>{children}</div>;
}
function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="block text-sm"><span className="mb-1 block text-muted-foreground">{label}</span>{children}</label>;
}
function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-background/80 backdrop-blur-sm sm:items-center" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-2xl border border-border bg-card p-5 sm:rounded-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-display text-xl text-gold">{title}</h3>
          <button onClick={onClose} className="text-2xl text-muted-foreground" aria-label="Kapat">×</button>
        </div>
        {children}
      </div>
    </div>
  );
}
function MonthFilter({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="mb-4 flex items-center gap-2">
      <input type="month" className="input flex-1" value={value} onChange={(e) => onChange(e.target.value)} aria-label="Ay filtresi" />
      <button className={value ? "btn-ghost" : "btn-ghost text-gold"} onClick={() => onChange("")}>Tümü</button>
    </div>
  );
}
function SectionHead({ title, action }: { title: string; action?: ReactNode }) {
  return <div className="mb-4 flex items-center justify-between gap-2"><h2 className="font-display text-2xl">{title}</h2>{action}</div>;
}

/* ---------- overview ---------- */
function Overview({ tasks, entries, notes, go }: { tasks: Task[]; entries: Entry[]; notes: Note[]; go: (t: Tab) => void }) {
  const b = balances(entries);
  const upcoming = tasks.filter((t) => t.status === "Planlandı").sort((a, z) => (a.date + a.time).localeCompare(z.date + z.time)).slice(0, 3);
  return (
    <div className="space-y-4">
      <Card className="hero-card">
        <p className="text-sm text-muted-foreground">Güncel Bakiye</p>
        <p className="font-display text-4xl text-gold">{tl(b.total)}</p>
        <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
          <div><p className="text-muted-foreground">Geçen aydan devreden</p><p className="font-semibold">{tl(b.carry)}</p></div>
          <div><p className="text-muted-foreground">Bu ay</p><p className="font-semibold">{tl(b.thisMonth)}</p></div>
        </div>
      </Card>
      <div className="grid grid-cols-3 gap-3">
        <Card onClick={() => go("gorev")} className="cursor-pointer text-center"><p className="text-2xl font-bold">{tasks.length}</p><p className="text-xs text-muted-foreground">Görev</p></Card>
        <Card onClick={() => go("istizan")} className="cursor-pointer text-center"><p className="text-2xl font-bold">{entries.length}</p><p className="text-xs text-muted-foreground">İstizan</p></Card>
        <Card onClick={() => go("not")} className="cursor-pointer text-center"><p className="text-2xl font-bold">{notes.length}</p><p className="text-xs text-muted-foreground">Not</p></Card>
      </div>
      <Card>
        <h3 className="mb-2 font-display text-lg text-gold">Yaklaşan Görevler</h3>
        {upcoming.length ? upcoming.map((t) => (
          <div key={t.id} className="flex justify-between border-b border-border py-2 text-sm last:border-0">
            <span>{t.title}</span><span className="text-muted-foreground">{fmtDate(t.date)} {t.time}</span>
          </div>
        )) : <p className="text-sm text-muted-foreground">Planlanmış görev yok.</p>}
      </Card>
    </div>
  );
}

/* ---------- tasks ---------- */
const emptyTask = (): Task => ({ id: "", title: "", date: today(), time: "", priority: "Orta", plan: "", status: "Planlandı" });
function Tasks({ tasks, setTasks }: { tasks: Task[]; setTasks: (f: (t: Task[]) => Task[]) => void }) {
  const [month, setMonth] = useState("");
  const [status, setStatus] = useState<"" | Task["status"]>("");
  const [form, setForm] = useState<Task | null>(null);
  const list = tasks
    .filter((t) => (!month || monthOf(t.date) === month) && (!status || t.status === status))
    .sort((a, z) => (a.date + a.time).localeCompare(z.date + z.time));
  const save = () => {
    if (!form?.title.trim()) return;
    setTasks((all) => form.id ? all.map((t) => (t.id === form.id ? form : t)) : [...all, { ...form, id: uid() }]);
    setForm(null);
  };
  return (
    <div>
      <SectionHead title="Görevler" action={<button className="btn-gold" onClick={() => setForm(emptyTask())}>+ Yeni Görev</button>} />
      <MonthFilter value={month} onChange={setMonth} />
      <div className="mb-4 flex gap-2">
        {(["", "Planlandı", "Tamamlandı"] as const).map((s) => (
          <button key={s} onClick={() => setStatus(s)} className={`chip ${status === s ? "chip-on" : ""}`}>{s || "Hepsi"}</button>
        ))}
      </div>
      <div className="space-y-3">
        {list.length === 0 && <p className="text-center text-sm text-muted-foreground">Görev yok.</p>}
        {list.map((t) => (
          <Card key={t.id}>
            <div className="flex items-start gap-3">
              <button aria-label="Durumu değiştir"
                onClick={() => setTasks((all) => all.map((x) => x.id === t.id ? { ...x, status: x.status === "Planlandı" ? "Tamamlandı" : "Planlandı" } : x))}
                className={`mt-1 h-5 w-5 shrink-0 rounded-full border-2 border-gold ${t.status === "Tamamlandı" ? "bg-gold" : ""}`} />
              <div className="min-w-0 flex-1" onClick={() => setForm(t)}>
                <p className={`font-semibold ${t.status === "Tamamlandı" ? "text-muted-foreground line-through" : ""}`}>{t.title}</p>
                <p className="text-xs text-muted-foreground">{fmtDate(t.date)} {t.time && `· ${t.time}`} · <span className={`prio-${t.priority === "Yüksek" ? "high" : t.priority === "Orta" ? "mid" : "low"}`}>{t.priority}</span> · {t.status}</p>
                {t.plan && <p className="mt-1 whitespace-pre-line text-sm">{t.plan}</p>}
              </div>
              <button className="text-destructive" aria-label="Sil" onClick={() => confirm("Silinsin mi?") && setTasks((all) => all.filter((x) => x.id !== t.id))}>🗑</button>
            </div>
          </Card>
        ))}
      </div>
      {form && (
        <Modal title={form.id ? "Görevi Düzenle" : "Yeni Görev"} onClose={() => setForm(null)}>
          <div className="space-y-3">
            <Field label="Başlık"><input className="input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Tarih"><input type="date" className="input" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></Field>
              <Field label="Saat"><input type="time" className="input" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} /></Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Öncelik"><select className="input" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value as Priority })}>{["Düşük", "Orta", "Yüksek"].map((p) => <option key={p}>{p}</option>)}</select></Field>
              <Field label="Durum"><select className="input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as Task["status"] })}><option>Planlandı</option><option>Tamamlandı</option></select></Field>
            </div>
            <Field label="Detaylı Plan"><textarea rows={4} className="input" value={form.plan} onChange={(e) => setForm({ ...form, plan: e.target.value })} /></Field>
            <button className="btn-gold w-full" onClick={save}>Kaydet</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

/* ---------- istizan ---------- */
function Istizan({ entries, setEntries }: { entries: Entry[]; setEntries: (f: (e: Entry[]) => Entry[]) => void }) {
  const [kind, setKind] = useState<EntryKind>("yatan");
  const [month, setMonth] = useState("");
  const [form, setForm] = useState<Entry | null>(null);
  const [detail, setDetail] = useState<Entry | null>(null);
  const b = balances(entries);
  const list = entries.filter((e) => e.kind === kind && (!month || monthOf(e.date) === month)).sort((a, z) => z.date.localeCompare(a.date));
  const total = list.reduce((s, e) => s + e.amount, 0);
  const save = () => {
    if (!form || !form.name.trim()) return;
    setEntries((all) => form.id ? all.map((e) => (e.id === form.id ? form : e)) : [...all, { ...form, id: uid() }]);
    setForm(null);
  };
  return (
    <div>
      <SectionHead title="İstizan" action={<button className="btn-gold" onClick={() => setForm({ id: "", kind, name: "", date: today(), person: "", amount: 0 })}>+ Yeni İstizan Ekle</button>} />
      <div className="mb-4 flex snap-x gap-3 overflow-x-auto pb-1">
        <Card className="hero-card min-w-[80%] snap-start"><p className="text-sm text-muted-foreground">Güncel Bakiye</p><p className="font-display text-3xl text-gold">{tl(b.total)}</p></Card>
        <Card className="min-w-[80%] snap-start">
          <p className="text-sm text-muted-foreground">Geçen Aydan Devreden</p><p className="text-xl font-semibold">{tl(b.carry)}</p>
          <p className="mt-2 text-sm text-muted-foreground">Bu Ayki Bakiye</p><p className="text-xl font-semibold">{tl(b.thisMonth)}</p>
        </Card>
      </div>
      <div className="mb-4 grid grid-cols-3 gap-2">
        {(["yatan", "iade", "malzeme"] as EntryKind[]).map((k) => (
          <button key={k} onClick={() => setKind(k)} className={`chip justify-center ${kind === k ? "chip-on" : ""}`}>{k === "malzeme" ? "Malzemeler" : KIND_LABEL[k]}</button>
        ))}
      </div>
      <MonthFilter value={month} onChange={setMonth} />
      <p className="mb-2 text-sm text-muted-foreground">{KIND_LABEL[kind]} toplamı: <span className="font-semibold text-gold">{tl(total)}</span></p>
      <div className="space-y-3">
        {list.length === 0 && <p className="text-center text-sm text-muted-foreground">Kayıt yok.</p>}
        {list.map((e) => (
          <Card key={e.id} onClick={() => setDetail(e)} className="cursor-pointer">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-semibold">{e.name}{e.material && ` — ${e.material}`}</p>
                <p className="text-xs text-muted-foreground">{fmtDate(e.date)} · {e.person || "-"}{e.qty && ` · ${e.qty}`}</p>
              </div>
              <p className={`shrink-0 font-semibold ${e.kind === "malzeme" ? "text-destructive" : "text-gold"}`}>{e.kind === "malzeme" ? "−" : "+"}{tl(e.amount)}</p>
            </div>
          </Card>
        ))}
      </div>
      {detail && (
        <Modal title="Kayıt Özeti" onClose={() => setDetail(null)}>
          <dl className="space-y-2 text-sm">
            {([["Kategori", KIND_LABEL[detail.kind]], ["Kayıt adı", detail.name], ["Tarih", fmtDate(detail.date)],
              ...(detail.kind === "malzeme" ? [["Malzeme", detail.material], ["Alınan yer", detail.place], ["Adet / Miktar", detail.qty]] : []),
              ["Alan kişi", detail.person], ["Tutar", tl(detail.amount)]] as [string, string | undefined][]).map(([k, v]) => (
              <div key={k} className="flex justify-between border-b border-border pb-2"><dt className="text-muted-foreground">{k}</dt><dd className="font-semibold">{v || "-"}</dd></div>
            ))}
          </dl>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <button className="btn-ghost" onClick={() => { setForm(detail); setDetail(null); }}>Düzenle</button>
            <button className="btn-ghost text-destructive" onClick={() => { if (confirm("Silinsin mi?")) { setEntries((all) => all.filter((x) => x.id !== detail.id)); setDetail(null); } }}>Sil</button>
          </div>
        </Modal>
      )}
      {form && (
        <Modal title={form.id ? "İstizan Düzenle" : "Yeni İstizan Ekle"} onClose={() => setForm(null)}>
          <div className="space-y-3">
            <Field label="Kategori"><select className="input" value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value as EntryKind })}>
              {(["yatan", "iade", "malzeme"] as EntryKind[]).map((k) => <option key={k} value={k}>{KIND_LABEL[k]}</option>)}</select></Field>
            <Field label="Kayıt adı"><input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
            {form.kind === "malzeme" && (<>
              <Field label="Malzemenin adı"><input className="input" value={form.material ?? ""} onChange={(e) => setForm({ ...form, material: e.target.value })} /></Field>
              <Field label="Alınan yer"><input className="input" value={form.place ?? ""} onChange={(e) => setForm({ ...form, place: e.target.value })} /></Field>
              <Field label="Adet / Miktar"><input className="input" value={form.qty ?? ""} onChange={(e) => setForm({ ...form, qty: e.target.value })} /></Field>
            </>)}
            <Field label={form.kind === "malzeme" ? "Alan kişi" : "Kişi"}><input className="input" value={form.person} onChange={(e) => setForm({ ...form, person: e.target.value })} /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Tarih"><input type="date" className="input" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></Field>
              <Field label="Tutar (₺)"><input type="number" inputMode="decimal" className="input" value={form.amount || ""} onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })} /></Field>
            </div>
            <button className="btn-gold w-full" onClick={save}>Kaydet</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

/* ---------- notes ---------- */
function Notes({ notes, setNotes }: { notes: Note[]; setNotes: (f: (n: Note[]) => Note[]) => void }) {
  const [q, setQ] = useState("");
  const [month, setMonth] = useState("");
  const [form, setForm] = useState<Note | null>(null);
  const list = notes.filter((n) => (!month || monthOf(n.date) === month) && (n.title + n.body).toLocaleLowerCase("tr").includes(q.toLocaleLowerCase("tr"))).sort((a, z) => z.date.localeCompare(a.date));
  const save = () => {
    if (!form?.title.trim()) return;
    setNotes((all) => form.id ? all.map((n) => (n.id === form.id ? form : n)) : [...all, { ...form, id: uid() }]);
    setForm(null);
  };
  return (
    <div>
      <SectionHead title="Notlar" action={<button className="btn-gold" onClick={() => setForm({ id: "", title: "", body: "", date: today() })}>+ Yeni Not</button>} />
      <input className="input mb-3" placeholder="Notlarda ara…" value={q} onChange={(e) => setQ(e.target.value)} />
      <MonthFilter value={month} onChange={setMonth} />
      <div className="grid gap-3 sm:grid-cols-2">
        {list.length === 0 && <p className="text-center text-sm text-muted-foreground sm:col-span-2">Not yok.</p>}
        {list.map((n) => (
          <Card key={n.id} onClick={() => setForm(n)} className="cursor-pointer">
            <div className="flex justify-between gap-2">
              <p className="font-semibold text-gold">{n.title}</p>
              <button aria-label="Sil" className="text-destructive" onClick={(e) => { e.stopPropagation(); if (confirm("Silinsin mi?")) setNotes((all) => all.filter((x) => x.id !== n.id)); }}>🗑</button>
            </div>
            <p className="text-xs text-muted-foreground">{fmtDate(n.date)}</p>
            <p className="mt-2 line-clamp-4 whitespace-pre-line text-sm">{n.body}</p>
          </Card>
        ))}
      </div>
      {form && (
        <Modal title={form.id ? "Notu Düzenle" : "Yeni Not"} onClose={() => setForm(null)}>
          <div className="space-y-3">
            <Field label="Başlık"><input className="input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></Field>
            <Field label="Tarih"><input type="date" className="input" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></Field>
            <Field label="İçerik"><textarea rows={6} className="input" value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} /></Field>
            <button className="btn-gold w-full" onClick={save}>Kaydet</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

/* ---------- report ---------- */
function Report({ tasks, entries, notes, onClose }: { tasks: Task[]; entries: Entry[]; notes: Note[]; onClose: () => void }) {
  const b = balances(entries);
  const months = useMemo(() => monthly(entries), [entries]);
  const sum = (k: EntryKind) => entries.filter((e) => e.kind === k).reduce((s, e) => s + e.amount, 0);
  const done = tasks.filter((t) => t.status === "Tamamlandı").length;
  return (
    <Modal title="☾★ İstizan Özeti" onClose={onClose}>
      <div className="space-y-5 text-sm">
        <section>
          <h4 className="mb-2 font-semibold text-gold">Kısa Özet</h4>
          <ul className="list-disc space-y-1 pl-5">
            <li>Toplam yatan para: <b>{tl(sum("yatan"))}</b></li>
            <li>Toplam iade: <b>{tl(sum("iade"))}</b></li>
            <li>Malzemelere harcanan: <b>{tl(sum("malzeme"))}</b></li>
            <li>Geçen aylardan devreden: <b>{tl(b.carry)}</b>, bu ay: <b>{tl(b.thisMonth)}</b></li>
            <li>Kalan güncel bakiye: <b className="text-gold">{tl(b.total)}</b></li>
            <li>{tasks.length} görevin {done} tanesi tamamlandı, {tasks.length - done} tanesi planlandı. {notes.length} not var.</li>
          </ul>
        </section>
        {months.length > 0 && (
          <section>
            <h4 className="mb-2 font-semibold text-gold">Aylık Döküm</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead><tr className="text-muted-foreground"><th className="text-left">Ay</th><th className="text-right">Yatan</th><th className="text-right">İade</th><th className="text-right">Malzeme</th><th className="text-right">Bakiye</th></tr></thead>
                <tbody>{months.map((m) => (
                  <tr key={m.month} className="border-t border-border"><td className="py-1">{fmtMonth(m.month)}</td><td className="text-right">{tl(m.yatan)}</td><td className="text-right">{tl(m.iade)}</td><td className="text-right">{tl(m.malzeme)}</td><td className="text-right font-semibold">{tl(m.balance)}</td></tr>
                ))}</tbody>
              </table>
            </div>
          </section>
        )}
        {(["yatan", "iade", "malzeme"] as EntryKind[]).map((k) => {
          const l = entries.filter((e) => e.kind === k);
          if (!l.length) return null;
          return (
            <section key={k}>
              <h4 className="mb-2 font-semibold text-gold">{KIND_LABEL[k]}</h4>
              <ol className="space-y-1">
                {l.map((e, i) => (
                  <li key={e.id} className="flex justify-between gap-2 border-b border-border pb-1">
                    <span>{i + 1}. {fmtDate(e.date)} · {e.name}{e.material && ` (${e.material}${e.qty ? `, ${e.qty}` : ""}${e.place ? `, ${e.place}` : ""})`} · {e.person}</span>
                    <span className="shrink-0">{tl(e.amount)}</span>
                  </li>
                ))}
                <li className="flex justify-between font-bold"><span>TOPLAM</span><span>{tl(sum(k))}</span></li>
              </ol>
            </section>
          );
        })}
        <div className="grid grid-cols-2 gap-2">
          <button className="btn-gold" onClick={() => openPdf(entries, tasks, notes)}>PDF İndir</button>
          <button className="btn-ghost" onClick={() => downloadExcel(entries, tasks, notes)}>Excel İndir</button>
        </div>
        <p className="text-xs text-muted-foreground">PDF için açılan pencerede "PDF olarak kaydet" seçin.</p>
      </div>
    </Modal>
  );
}
