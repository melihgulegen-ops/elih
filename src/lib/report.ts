import { balances, fmtDate, fmtMonth, KIND_LABEL, monthly, tl, type Entry, type EntryKind, type Note, type Task } from "./store";

const esc = (s: string) => (s ?? "").replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]!);

export function openPdf(entries: Entry[], tasks: Task[], notes: Note[]) {
  const b = balances(entries);
  const sum = (k: EntryKind) => entries.filter((e) => e.kind === k).reduce((s, e) => s + e.amount, 0);
  const months = monthly(entries);
  const cat = (k: EntryKind) => {
    const list = entries.filter((e) => e.kind === k).sort((a, z) => a.date.localeCompare(z.date));
    if (!list.length) return "";
    const mat = k === "malzeme";
    return `<h2>${KIND_LABEL[k]}</h2><table><tr><th>#</th><th>Tarih</th><th>Kayıt</th>${mat ? "<th>Malzeme</th><th>Alınan Yer</th><th>Adet</th>" : ""}<th>Kişi</th><th>Tutar</th></tr>
    ${list.map((e, i) => `<tr><td>${i + 1}</td><td>${fmtDate(e.date)}</td><td>${esc(e.name)}</td>${mat ? `<td>${esc(e.material ?? "")}</td><td>${esc(e.place ?? "")}</td><td>${esc(e.qty ?? "")}</td>` : ""}<td>${esc(e.person)}</td><td class="r">${tl(e.amount)}</td></tr>`).join("")}
    <tr class="t"><td colspan="${mat ? 7 : 4}">TOPLAM</td><td class="r">${tl(sum(k))}</td></tr></table>`;
  };
  const html = `<!doctype html><html lang="tr"><head><meta charset="utf-8"><title>İstizan Raporu</title><style>
  body{font-family:Arial,sans-serif;color:#111;padding:24px;font-size:12px}h1{margin:0;color:#0b1a3a}h2{margin-top:22px;border-bottom:2px solid #c9a227;padding-bottom:4px;color:#0b1a3a}
  table{width:100%;border-collapse:collapse;margin-top:6px}th,td{border:1px solid #ccc;padding:5px;text-align:left}th{background:#0b1a3a;color:#fff}.r{text-align:right}.t td{font-weight:bold;background:#f4ecd0}
  ul{line-height:1.8}footer{margin-top:30px;text-align:center;color:#666;border-top:1px solid #ccc;padding-top:8px}</style></head><body>
  <h1>☾★ İstizan</h1><div>Rapor tarihi: ${new Date().toLocaleString("tr-TR")}</div>
  <h2>Kısa Özet</h2><ul><li>Toplam yatan: <b>${tl(sum("yatan"))}</b></li><li>Toplam iade: <b>${tl(sum("iade"))}</b></li><li>Malzeme harcaması: <b>${tl(sum("malzeme"))}</b></li>
  <li>Geçen aylardan devreden: <b>${tl(b.carry)}</b></li><li>Bu ay: <b>${tl(b.thisMonth)}</b></li><li>Güncel bakiye: <b>${tl(b.total)}</b></li>
  <li>Görevler: ${tasks.filter((t) => t.status === "Tamamlandı").length} tamamlandı, ${tasks.filter((t) => t.status === "Planlandı").length} planlandı</li><li>Not sayısı: ${notes.length}</li></ul>
  ${months.length ? `<h2>Aylık Döküm</h2><table><tr><th>Ay</th><th>Yatan</th><th>İade</th><th>Malzeme</th><th>Ay Sonu Bakiye</th></tr>${months.map((m) => `<tr><td>${fmtMonth(m.month)}</td><td class="r">${tl(m.yatan)}</td><td class="r">${tl(m.iade)}</td><td class="r">${tl(m.malzeme)}</td><td class="r">${tl(m.balance)}</td></tr>`).join("")}</table>` : ""}
  ${cat("yatan")}${cat("iade")}${cat("malzeme")}
  ${tasks.length ? `<h2>Görevler</h2><table><tr><th>#</th><th>Tarih</th><th>Saat</th><th>Görev</th><th>Öncelik</th><th>Durum</th><th>Plan</th></tr>${tasks.map((t, i) => `<tr><td>${i + 1}</td><td>${fmtDate(t.date)}</td><td>${t.time || "-"}</td><td>${esc(t.title)}</td><td>${t.priority}</td><td>${t.status}</td><td>${esc(t.plan)}</td></tr>`).join("")}</table>` : ""}
  ${notes.length ? `<h2>Notlar</h2><table><tr><th>#</th><th>Tarih</th><th>Başlık</th><th>İçerik</th></tr>${notes.map((n, i) => `<tr><td>${i + 1}</td><td>${fmtDate(n.date)}</td><td>${esc(n.title)}</td><td>${esc(n.body)}</td></tr>`).join("")}</table>` : ""}
  <footer>Melih Gülegen · MGN</footer><script>setTimeout(()=>print(),300)</script></body></html>`;
  const w = window.open("", "_blank");
  if (!w) return alert("Açılır pencereye izin verin.");
  w.document.write(html);
  w.document.close();
}

export async function downloadExcel(entries: Entry[], tasks: Task[], notes: Note[]) {
  const XLSX = await import("xlsx");
  const b = balances(entries);
  const wb = XLSX.utils.book_new();
  const sum = (k: EntryKind) => entries.filter((e) => e.kind === k).reduce((s, e) => s + e.amount, 0);
  const add = (name: string, rows: object[]) =>
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows.length ? rows : [{ Bilgi: "Kayıt yok" }]), name);
  add("Özet", [
    { Başlık: "Toplam Yatan (₺)", Değer: sum("yatan") },
    { Başlık: "Toplam İade (₺)", Değer: sum("iade") },
    { Başlık: "Malzeme Harcaması (₺)", Değer: sum("malzeme") },
    { Başlık: "Geçen Aylardan Devreden (₺)", Değer: b.carry },
    { Başlık: "Bu Ay (₺)", Değer: b.thisMonth },
    { Başlık: "Güncel Bakiye (₺)", Değer: b.total },
    { Başlık: "Görev Sayısı", Değer: tasks.length },
    { Başlık: "Not Sayısı", Değer: notes.length },
    { Başlık: "İmza", Değer: "Melih Gülegen · MGN" },
  ]);
  add("Aylık Döküm", monthly(entries).map((m) => ({ Ay: fmtMonth(m.month), Yatan: m.yatan, İade: m.iade, Malzeme: m.malzeme, "Ay Sonu Bakiye": m.balance })));
  (["yatan", "iade", "malzeme"] as EntryKind[]).forEach((k) =>
    add(KIND_LABEL[k].slice(0, 31), entries.filter((e) => e.kind === k).map((e) => ({
      Tarih: fmtDate(e.date), Kayıt: e.name, ...(k === "malzeme" ? { Malzeme: e.material, "Alınan Yer": e.place, Adet: e.qty } : {}), Kişi: e.person, "Tutar (₺)": e.amount,
    }))),
  );
  add("Görevler", tasks.map((t) => ({ Tarih: fmtDate(t.date), Saat: t.time, Görev: t.title, Öncelik: t.priority, Durum: t.status, Plan: t.plan })));
  add("Notlar", notes.map((n) => ({ Tarih: fmtDate(n.date), Başlık: n.title, İçerik: n.body })));
  XLSX.writeFile(wb, `istizan-rapor-${new Date().toISOString().slice(0, 10)}.xlsx`);
}
