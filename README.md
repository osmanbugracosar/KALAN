# Kalan

> **ne geldi, ne gitti, ne kaldı?**
> Çevrimdışı, gizliliğe saygılı kişisel finans masaüstü uygulaması.

Kalan; gelir, gider, transfer, borç ve birikimleri tek bir yerde takip
etmek için tasarlanmış bir masaüstü uygulamasıdır. Sabit bir maaş
varsaymaz — gelir yalnızca gerçekten kaydedilen işlemlerden gelir.
Tüm veriler kullanıcının cihazında, yerel bir SQLite dosyasında saklanır;
hiçbir sunucuya veri gönderilmez, banka şifresi istenmez.

## Öne çıkanlar

- **Kuruş hassasiyeti** — tüm para değerleri tam sayı (kuruş) olarak
  tutulur, float yuvarlama hatası yoktur. Ekranda `₺12.450,00` biçimi.
- **Dürüst muhasebe** — transferler gelir/gider sayılmaz; borç girişi
  gelir değildir; birikim katkısı normal gider değildir.
- **Borç mantığı** — kalan borç her zaman ödemelerden yeniden hesaplanır
  (mutable alan yok), asla negatife düşmez, aşırı ödeme engellenir.
- **Çevrimdışı** — internet gerekmez, veriler yereldir.
- **Açık/koyu tema**, tamamen Türkçe arayüz.

## Teknoloji

| Katman | Teknoloji |
|--------|-----------|
| Kabuk  | Tauri 2 (Rust) |
| Arayüz | React 18 + TypeScript + Vite |
| Stil   | Tailwind CSS (özel tasarım token'ları) |
| Durum  | Zustand |
| Grafik | Recharts |
| Veri   | SQLite (`tauri-plugin-sql`) |
| Test   | Vitest |

## Proje yapısı

```
kalan/
├── src/
│   ├── core/          # money.ts, date.ts, security.ts (saf, test edilmiş)
│   ├── domain/        # enums.ts, types.ts (tüm arayüzler)
│   ├── services/      # calculations.ts, debt.ts, budget.ts (saf finans motoru)
│   ├── db/            # database, repositories, persistence, demoData, mapping
│   ├── store/         # useFinanceStore, useUIStore, selectors
│   ├── ui/            # yeniden kullanılabilir bileşenler + grafikler
│   ├── app/           # Sidebar, TopBar, AppShell, SetupWizard, TransactionModal
│   ├── pages/         # Overview, Accounts, Transactions, Debts, Settings, ...
│   ├── App.tsx        # durum yönlendirmesi (loading/setup/ready/error)
│   └── main.tsx       # React girişi
├── src-tauri/
│   ├── src/           # main.rs, lib.rs (SQL göçlerini kaydeder)
│   ├── migrations/    # 0001_init.sql (16 tablo şeması)
│   ├── capabilities/  # izinler
│   ├── icons/         # uygulama ikonları
│   └── tauri.conf.json
└── KURULUM.txt        # Türkçe kurulum rehberi (teknik olmayan)
```

## Komutlar

```bash
npm install          # bağımlılıkları kur (bir kez)

npm run dev          # tarayıcı önizlemesi (örnek veriyle, kurulumsuz)
npm run tauri:dev    # gerçek masaüstü penceresi (Rust gerekir)
npm run tauri:build  # dağıtılabilir Windows kurulumu (.exe/.msi) üretir

npm test             # birim + entegrasyon testleri (79 test)
npm run typecheck    # TypeScript tip denetimi
npm run build        # tsc + vite üretim derlemesi
```

Masaüstü derlemesi için ön koşullar (Windows): Node.js, Rust (rustup),
Microsoft C++ Build Tools, WebView2 Runtime. Ayrıntılar için
`KURULUM.txt`.

## Mimari notları

- **Borç ödemeleri** kendi `debt_payments` tablosunda tutulur (yetkili
  kayıt defteri). Hesaplamalar ve birleşik "İşlemler" görünümü için bu
  ödemeler, DB'ye yazılmayan sentetik `debt_payment` işlem nesnelerine
  eşlenir (`src/db/mapping.ts`).
- **Finans motoru** (`src/services/`) tamamen saftır — DB'ye veya
  duruma bağımlı değildir, bu yüzden birebir test edilebilir.
- **Çift modlu store**: Tauri'de SQLite'a yazar; tarayıcıda
  (`npm run dev`) bellek içi örnek veriyle çalışır.
- **Kalan borç** hiçbir zaman saklanmaz; her okumada ödemelerden
  hesaplanır. Düzenleme/silme sonrası otomatik güncellenir.

## Durum

**Faz 1 (tamamlandı):** çekirdek finans motoru, veri katmanı (16 tablo),
uygulama kabuğu, Genel Bakış / Hesaplarım / İşlemler / Borçlarım / Ayarlar
sayfaları, kurulum sihirbazı, örnek veri, Windows derleme yapılandırması.

**Faz 2 (tamamlandı):** Birikim Hedefleri (katkı ekleme, ilerleme,
tahmini süre), Bütçeler (kategori/genel, haftalık/aylık, aşım göstergeleri,
ay sonu projeksiyonu), Düzenli Ödemeler (vadesi gelenler, tek tıkla kaydet,
sıklık takvimi), Raporlar & İçgörüler (dönem özeti, kategori dağılımı, en
çok harcanan yerler, CSV dışa aktarma, PDF/yazdır), PIN kilit ekranı.
Toplam 88 birim + entegrasyon testi.

**Sıradaki (yakında):** Giderler için kalem-kalem (fiş satırı) bölme arayüzü,
tam yedekleme/geri yükleme ve banka ekstresinden içe aktarma. Veri modeli
bunları şimdiden öngörür; ilgili iki sayfa "yakında" olarak işaretlidir.

---

© LineDesign · Sürüm 1.0.0
