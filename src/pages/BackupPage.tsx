import { useRef, useState } from 'react';
import { Download, Upload, FileJson, FileSpreadsheet, ShieldCheck, AlertTriangle, FileDown, HardDriveDownload, FolderClock } from 'lucide-react';
import { useFinanceStore } from '../store/useFinanceStore';
import { useUIStore } from '../store/useUIStore';
import { useSnapshot } from '../app/useSnapshot';
import { todayLocalDate, formatDateTimeTR } from '../core/date';
import { BACKUP_DIR_LABEL } from '../db/fsBackup';
import type { BackupFile, CsvImportRow } from '../store/useFinanceStore';
import { parseDelimited, toImportRows } from '../services/csvImport';
import { Card, CardHeader } from '../ui/Card';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { Field, Select } from '../ui/Field';

function downloadText(filename: string, text: string, mime: string) {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function BackupPage() {
  const s = useSnapshot();
  const pushToast = useUIStore((st) => st.pushToast);
  const buildBackup = useFinanceStore((st) => st.buildBackup);
  const restoreBackup = useFinanceStore((st) => st.restoreBackup);
  const importCsv = useFinanceStore((st) => st.importTransactionsCsv);
  const backupToDisk = useFinanceStore((st) => st.backupToDisk);
  const lastAuto = useFinanceStore((st) => st.settings.last_auto_backup);
  const isDesktop = useFinanceStore((st) => st.mode === 'tauri');
  const [diskBusy, setDiskBusy] = useState(false);

  const jsonInputRef = useRef<HTMLInputElement>(null);
  const csvInputRef = useRef<HTMLInputElement>(null);

  const activeAccounts = s.accounts.filter((a) => a.is_active === 1);
  const [defaultAccountId, setDefaultAccountId] = useState<string>(activeAccounts[0] ? String(activeAccounts[0].id) : '');

  const [pendingRestore, setPendingRestore] = useState<BackupFile | null>(null);
  const [pendingCsv, setPendingCsv] = useState<{ rows: CsvImportRow[]; skipped: number; matched: number } | null>(null);
  const [busy, setBusy] = useState(false);

  /* ---- Yedek al ---- */
  const doBackup = () => {
    const backup = buildBackup();
    downloadText(`kalan-yedek-${todayLocalDate()}.json`, JSON.stringify(backup, null, 2), 'application/json');
    pushToast('success', 'Yedek dosyası indirildi.');
  };

  const doDiskBackup = async () => {
    setDiskBusy(true);
    const res = await backupToDisk();
    setDiskBusy(false);
    pushToast(res.ok ? 'success' : 'error', res.ok ? 'Belgeler klasörüne yedeklendi.' : res.message ?? 'Yedeklenemedi.');
  };

  /* ---- Geri yükle (JSON) ---- */
  const onJsonPicked = async (file: File) => {
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as BackupFile;
      if (parsed?.app !== 'kalan' || !parsed.data) {
        pushToast('error', 'Bu dosya bir Kalan yedeği değil.');
        return;
      }
      setPendingRestore(parsed);
    } catch {
      pushToast('error', 'Dosya okunamadı ya da geçersiz.');
    }
  };

  const confirmRestore = async () => {
    if (!pendingRestore) return;
    setBusy(true);
    const res = await restoreBackup(pendingRestore);
    setBusy(false);
    setPendingRestore(null);
    pushToast(res.ok ? 'success' : 'error', res.ok ? 'Yedek geri yüklendi.' : res.message ?? 'Geri yükleme başarısız.');
  };

  /* ---- CSV içe aktar ---- */
  const onCsvPicked = async (file: File) => {
    try {
      const text = await file.text();
      const matrix = parseDelimited(text);
      const { rows: parsed, skipped } = toImportRows(matrix);
      if (parsed.length === 0) {
        pushToast('error', 'Uygun satır bulunamadı. Sütun başlıklarını kontrol et.');
        return;
      }
      // Hesap adlarını mevcut hesaplarla eşleştir; eşleşmezse varsayılan hesap
      const byName = new Map(s.accounts.map((a) => [a.name.toLocaleLowerCase('tr'), a.id]));
      const fallback = defaultAccountId ? Number(defaultAccountId) : null;
      let matched = 0;
      const rows: CsvImportRow[] = parsed.map((p) => {
        let accountId = fallback;
        if (p.accountName) {
          const hit = byName.get(p.accountName.toLocaleLowerCase('tr'));
          if (hit != null) { accountId = hit; matched++; }
        }
        return { date: p.date, type: p.type, amount: p.amount, accountId, categoryName: p.categoryName, description: p.description };
      });
      setPendingCsv({ rows, skipped, matched });
    } catch {
      pushToast('error', 'CSV okunamadı.');
    }
  };

  const confirmCsv = async () => {
    if (!pendingCsv) return;
    setBusy(true);
    const res = await importCsv(pendingCsv.rows);
    setBusy(false);
    setPendingCsv(null);
    pushToast(res.ok ? 'success' : 'error', res.message ?? (res.ok ? 'İçe aktarıldı.' : 'İçe aktarma başarısız.'));
  };

  const downloadTemplate = () => {
    const tpl = '\uFEFF' + ['Tarih;Tür;Tutar;Hesap;Kategori;Açıklama',
      '01.01.2026;Gider;123,45;Nakit;Market;Migros alışverişi',
      '05.01.2026;Gelir;5000,00;Banka;Maaş;Ocak maaşı'].join('\r\n');
    downloadText('kalan-ice-aktarma-sablonu.csv', tpl, 'text/csv;charset=utf-8');
  };

  return (
    <div className="max-w-3xl space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-ink">Yedekle & İçe Aktar</h2>
        <p className="text-[13px] text-muted mt-0.5">Verilerini tek dosyada yedekle, başka bir cihaza taşı ya da dosyadan işlem içe aktar.</p>
      </div>

      {/* Yedekleme */}
      <Card>
        <CardHeader title="Yedekleme" subtitle="Tüm verinin tek dosyada kopyası" action={<ShieldCheck size={18} className="text-muted" />} />

        {isDesktop && (
          <div className="mb-3 flex items-start gap-2.5 rounded-lg border border-income/25 bg-income/5 p-3">
            <FolderClock size={17} className="text-income mt-0.5 shrink-0" />
            <div className="text-[12.5px] leading-relaxed">
              <span className="text-ink font-medium">Otomatik yedekleme açık.</span>{' '}
              Uygulama her açılışta (günde bir kez) verini <span className="text-ink">{BACKUP_DIR_LABEL}</span> klasörüne kaydeder; son 10 yedek saklanır.
              {lastAuto && <span className="text-muted"> Son otomatik yedek: {formatDateTimeTR(lastAuto)}.</span>}
            </div>
          </div>
        )}

        <div className="space-y-3">
          <div className="flex items-center justify-between gap-4 rounded-lg border border-line bg-elevate/50 p-3.5">
            <div>
              <div className="text-[14px] font-medium text-ink flex items-center gap-2"><FileJson size={15} /> Yedek al (.json)</div>
              <p className="text-[12.5px] text-muted mt-0.5">Hesaplar, işlemler, borçlar, birikimler, bütçeler ve düzenli ödemeler dahil her şey.</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {isDesktop && <Button variant="secondary" onClick={doDiskBackup} disabled={diskBusy}><HardDriveDownload size={15} /> Belgeler'e</Button>}
              <Button onClick={doBackup}><Download size={15} /> İndir</Button>
            </div>
          </div>

          <div className="flex items-center justify-between gap-4 rounded-lg border border-warn/25 bg-warn/5 p-3.5">
            <div>
              <div className="text-[14px] font-medium text-ink flex items-center gap-2"><Upload size={15} /> Yedeği geri yükle</div>
              <p className="text-[12.5px] text-muted mt-0.5">Bir yedek dosyası yükler. <span className="text-warn font-medium">Mevcut tüm veriler bununla değiştirilir.</span></p>
            </div>
            <Button variant="secondary" onClick={() => jsonInputRef.current?.click()}>Dosya seç</Button>
            <input ref={jsonInputRef} type="file" accept="application/json,.json" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void onJsonPicked(f); e.target.value = ''; }} />
          </div>
        </div>
      </Card>

      {/* CSV içe aktarma */}
      <Card>
        <CardHeader title="İşlem içe aktarma (CSV)" subtitle="Banka ekstresi veya tablo dosyasından" action={<FileSpreadsheet size={18} className="text-muted" />} />
        <div className="space-y-4">
          <p className="text-[13px] text-muted">
            CSV dosyanda şu sütunlar olmalı: <span className="text-ink font-medium">Tarih, Tür, Tutar, Hesap, Kategori, Açıklama</span>.
            Hesap adı mevcut hesaplarınla eşleşmezse aşağıda seçtiğin hesap kullanılır. Olmayan kategoriler otomatik oluşturulur.
          </p>

          <Field label="Varsayılan hesap" hint="CSV'deki hesap adı eşleşmezse bu hesap kullanılır">
            <Select value={defaultAccountId} onChange={(e) => setDefaultAccountId(e.target.value)}>
              <option value="">Seç</option>
              {activeAccounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </Select>
          </Field>

          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={() => csvInputRef.current?.click()} disabled={!defaultAccountId && activeAccounts.length > 0}><Upload size={15} /> CSV dosyası seç</Button>
            <input ref={csvInputRef} type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void onCsvPicked(f); e.target.value = ''; }} />
            <Button variant="ghost" onClick={downloadTemplate}><FileDown size={15} /> Örnek şablon indir</Button>
          </div>
          {activeAccounts.length === 0 && <p className="text-[12.5px] text-warn">Önce en az bir hesap oluşturmalısın.</p>}
        </div>
      </Card>

      {/* Geri yükleme onayı */}
      {pendingRestore && (
        <Modal
          open
          onClose={() => setPendingRestore(null)}
          title="Yedeği geri yükle"
          size="sm"
          footer={<><Button variant="ghost" onClick={() => setPendingRestore(null)} disabled={busy}>Vazgeç</Button><Button variant="danger" onClick={confirmRestore} disabled={busy}>Evet, geri yükle</Button></>}
        >
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-warn"><AlertTriangle size={16} /><span className="text-[14px] font-medium">Dikkat</span></div>
            <p className="text-[14px] text-ink/80">
              Bu işlem <span className="font-medium">mevcut tüm verilerini siler</span> ve yedekteki verilerle değiştirir. Geri alınamaz.
            </p>
            <p className="text-[12.5px] text-muted">Yedek tarihi: {pendingRestore.exportedAt?.replace('T', ' ').slice(0, 16) ?? 'bilinmiyor'}</p>
          </div>
        </Modal>
      )}

      {/* CSV içe aktarma onayı */}
      {pendingCsv && (
        <Modal
          open
          onClose={() => setPendingCsv(null)}
          title="İçe aktarmayı onayla"
          size="sm"
          footer={<><Button variant="ghost" onClick={() => setPendingCsv(null)} disabled={busy}>Vazgeç</Button><Button onClick={confirmCsv} disabled={busy}>{pendingCsv.rows.length} işlemi ekle</Button></>}
        >
          <div className="space-y-2 text-[14px] text-ink/80">
            <p><span className="font-semibold text-ink">{pendingCsv.rows.length}</span> işlem içe aktarılacak.</p>
            <p className="text-[13px] text-muted">
              {pendingCsv.matched} tanesinin hesabı adıyla eşleşti, kalanı varsayılan hesaba eklenecek.
              {pendingCsv.skipped > 0 && ` ${pendingCsv.skipped} satır okunamadığı için atlandı.`}
            </p>
            <p className="text-[12.5px] text-muted">Mevcut işlemlerin korunur; bunlar üzerine eklenir.</p>
          </div>
        </Modal>
      )}
    </div>
  );
}
