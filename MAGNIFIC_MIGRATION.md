# Magnific App Görünümüne Geçiş — Özet

Referans: `magnific-app-design.md` (magnific.com/app'ten `getComputedStyle` ile ölçülen değerler). Yalnızca **sunum katmanı** değişti; hook'lar, state, Supabase çağrıları, route'lar, event isimleri ve toast metinleri aynı. `tsc`, `vite build` temiz; eslint hata sayısı baseline ile aynı (58, hepsi orijinal koddaki `any`).

## Karakter (ne değişti)
- **Nötr gri palet.** Zemin `#F5F5F5` → ana yüzey `#FAFAFA` → kart `#FFF`. Metin `#1A1A1A` / `#616161` / `#737373`. Mor/iris yok.
- **Yüzen yüzeyler.** Sol rail (72px, beyaz) ve ana çalışma alanı, zemin üstünde 8px boşlukla duran 16px köşeli kartlar; aralarında kenarlık yok.
- **Siyah birincil buton** (`#1A1A1A`, h32, r8, 12/500). Pasifken gri `#E3E3E3` + `#616161` (opaklık değil renk).
- **Pembe yalnızca marka aksiyonu:** rail'deki ve mobil top bar'daki "+" oluştur menüsü, "New"/upsell etiketi.
- **Mavi yalnızca odak ve switch.**
- **Kategori renkleri:** her araç türünün tonu (Image lavanta-mavi, Video mint, Audio camgöbeği, Design gül, Spaces mor); araç başlık kartı ve breadcrumb karesi bu tonu kullanır.
- **Tipografi:** Geist; UI varsayılanı 12/500; gövde 14; başlık 15/20; display 28/42; bölüm etiketleri 10px BÜYÜK HARF (`MODEL`, `REFERENCES`, `PROMPT`).
- **Kenarlık yerine ton:** input/select/chip kenarlıksız `%5 gri` dolgu; kenarlık yalnızca menü, kesikli yükleme kutusu, meta chip ve secondary butonda.
- **Gölge yok** (kartlar); yalnızca menü/dialog/yüzen bar'da çok katmanlı overlay gölgesi.
- Kontrol yükseklikleri: 24 / 28 / **32** / 40 (tam genişlik Generate).

## Kabuk
- Rail: logo → pembe "+" (oluştur menüsü: araçlar kategori renkli ikonlarla) → Packs / Styles / Library → ayırıcı → araç kısayolları → altta Usage. Etiket yok, isim tooltip'te; etkin öğe gri zeminli 32×32 kare.
- Top bar ana yüzeyin içinde: breadcrumb (`Lumra › Sayfa`), sağda kenarlıklı "Library", tema, avatar menüsü (Çıkış burada).
- Mobil: top bar + 5'li bottom navigation (+ "More" bottom sheet); sayfa paneli Sheet'te.

## Sayfa kalıpları
- **Araç sayfası** (Pack Creator, Bulk Generator, Text to Image, Quote, Glasses, Prompt): sol ~300px beyaz panel — araç başlık kartı → BÖLÜM ETİKETİ + kontroller → altta tam genişlik siyah **Generate ✦**; sağda sonuç akışı (`#F5F5F5` bloklarda prompt başlığı + meta chip'ler + zaman).
- **Liste sayfası** (Packs paneli, Styles, My Library, Usage): başlık + sayı, sağda siyah aksiyon, pill/segmented filtre, kenarlıklı filtre butonu; gölgesiz beyaz kartlar, ~190px grid kartları.
- **Empty state:** çizgi ikon + 20px başlık + 12px açıklama; buton yok (aksiyon sayfa başlığında).

## Dosyalar
- `src/index.css` — token katmanı (light/dark), tipografi sınıfları, `.pill-tabs`, `.segmented`, `.nav-item`, `.rail-item`, `.dropzone`, `.meta-chip`, `.skeleton`.
- `tailwind.config.ts` — renk/boşluk/radius/gölge/font ölçeği eşlemesi.
- `src/lib/utils.ts` — tailwind-merge, özel tipografi sınıflarını tanıyacak şekilde genişletildi (aksi halde `text-overline` gibi sınıflar siliniyordu).
- `src/components/ui/*` — Button (primary siyah, brand pembe, outline, secondary, ghost, info, danger…), Input/Select/Textarea, Badge (meta chip), Tabs (pill), Switch, Checkbox, Dialog/Sheet/Dropdown (r16 + overlay gölgesi), Label (bölüm etiketi).
- `src/components/AppLayout.tsx`, `TopHeader.tsx`, `IconRail.tsx` — kabuk.
- Tüm sayfalar ve bileşenler (`src/pages/*`, `src/components/*`).

## Mantık gerektirdiği için yapılmayanlar (`// TODO(magnific)` ile işaretli)
- `window.confirm` → AlertDialog (My Library silme).
- Tıklanabilir `div` satırlarına klavye desteği (PackList, PackSidebar, SceneCard).
- Studio'nun zorunlu dark teması (token'lar light'ı da destekliyor).
- Styles/My Library'de arama & sıralama (state yok).

Kurallar: `MAGNIFIC_CONVENTIONS.md`.
