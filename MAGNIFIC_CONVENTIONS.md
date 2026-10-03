# Magnific App — Uygulama Kuralları (bu repo için, v2)

Kaynak referans: `magnific-app-design.md` (magnific.com/app'ten ölçülen değerler). Karakter: **nötr, sakin, içerik öncelikli.** Arayüz gri tonlarından oluşur; renk yalnızca üç yerde: **pembe** (oluştur/upgrade), **mavi** (odak, switch), **kategori pastel tonları** (araç türleri). Birincil aksiyon **siyahtır**. Kartlar **gölgesiz ve kenarlıksızdır**; ayrımı zemin tonu yapar. UI metni **12px/500**.

## 0. KESİN SINIR — yalnızca sunum katmanı
- DEĞİŞTİRİLEBİLİR: `className`, JSX sarmalayıcı/düzen yapısı, ikon seçimi/boyutu, Button/Badge `variant`/`size`, aria-* / role / type="button", görünür etiketlerde küçük yazım düzeltmesi (sentence case).
- DEĞİŞTİRİLEMEZ: hook'lar, state, handler'lar, props arayüzleri, export isimleri, veri akışı, API/Supabase çağrıları, route'lar, toast metinleri, `id`/`key`/`data-*`, koşullu render mantığı, event bağlamaları, import edilen non-UI fonksiyonlar. Yeni bağımlılık yok.
- Mantık gerektiren UX fikri → `// TODO(magnific):` yorumu.

## 1. Renk — yalnızca bu utility'ler (hex, bg-black/white, iris-*, neutral-* YASAK)
| Amaç | Sınıf |
|---|---|
| Uygulama zemini (kartların arkası) | `bg-app` (#F5F5F5) — kabuk zaten uygular |
| Ana çalışma alanı | `bg-background` (#FAFAFA) — sayfa kökü |
| Kart / panel / menü yüzeyi | `bg-card` (#FFF) — **kenarlık ve gölge YOK** |
| Kontrol dolgusu (select, chip, referans kutusu, pasif ikon buton) | `bg-control` (≈ %5 gri), hover `bg-control-hover` |
| Etkin öğe (liste, rail) | `bg-active` (≈ %15 gri) + `text-foreground` |
| Segmented rayı | `bg-track` (#EDEDED) |
| Pill tab rayı | `bg-app` |
| Birincil metin | `text-foreground` (#1A1A1A) |
| İkincil metin, pasif sekme, bölüm etiketi | `text-muted-foreground` (#616161) |
| Üçüncül metin | `text-tertiary-foreground` (#737373) |
| Kenarlık (yalnızca menü, kesikli kutu, meta chip, secondary buton) | `border-border` (≈ rgba(16,16,16,.1)) |
| Siyah birincil buton | Button `variant="primary"` |
| Pembe marka | `bg-brand text-brand-foreground` / `text-brand` / Badge `variant="brand"` — YALNIZCA oluştur, upgrade, "New" etiketi, rozet |
| Odak / switch açık | `ring-ring` / `border-ring` (mavi) — bileşenler zaten uygular |
| Bilgi CTA | Button `variant="info"` (mavi pill) |
| Kategori renkleri | `text-cat-image bg-cat-image/10` (image), `cat-video`, `cat-audio`, `cat-design`, `cat-3d`, `cat-spaces` — araç başlık kartı ve 48px ikon kutusu |
| Durumlar | `text-success` (#17CB8D mint) / `text-destructive` / `text-warning`; zemin gerekiyorsa `bg-success-bg text-success-text` vb. |
| Medya üstü overlay | `bg-foreground/25 text-white` |

**Pasif öğeler opaklık değil renk değiştirir:** `disabled:text-tertiary-foreground`, pasif primary otomatik gri (#E3E3E3).
Eski sınıflar → yeni: `border border-border` (kartlarda) → KALDIR; `shadow-*` (kartlarda) → KALDIR; `bg-secondary` (seçili zemin) → `bg-active`; `bg-muted`/`bg-sunken`/`bg-accent` → `bg-control`; `text-primary` (vurgu) → `text-foreground`; `bg-primary/10 text-primary` ikon kutusu → `bg-control text-foreground` veya kategori rengi.

## 2. Tipografi (sınıflar hazır; Geist yüklü)
`text-display-lg` / `text-heading-xl` 28/42 500 (Home selamlama, sayfa display) · `text-heading-lg` 24/32 600 · `text-heading-md` 20/30 500 (bölüm başlığı, empty state başlığı) · `text-heading-sm` 15/24 500 (kart/araç başlığı) · `text-heading-xs` 14/22 500 · `text-body-md` 14/22.75 400 (prompt metni) · `text-body-sm` 12/18 400 · **`text-label-md` 12/18 500 = UI varsayılanı (menü, sekme, buton, liste)** · `text-caption` 12/18 400 · `text-overline` 10/15 600 UPPERCASE (**bölüm etiketi: MODEL, REFERENCES, PROMPT**) · `text-micro` 10/10 500 (rozet, durum) · `text-code`.
Tailwind `text-sm` = 12px, `text-base` = 14px, `text-xs` = 11px. `text-[8px]`/`[9px]` yasak.

## 3. Boşluk / boyut / köşe / gölge
- Adım 4px; sık değerler 4, 6, 8, 12, 16, 20, 28. Kart padding `p-4 md:p-7` (16/28). Banner `px-[18px] py-3`.
- **Kontrol yükseklikleri:** `h-control-xs` 24 (segmented öğesi, meta chip) · `h-control-sm` 28 · **`h-control-md` 32 (buton, select, menü öğesi, ikon buton — varsayılan)** · `h-control-lg` 40 (tam genişlik Generate) · 48px kategori ikon kutusu (`size-12`) · 65×65 referans kutusu (`size-[65px]`).
- Köşe: **`rounded-md` 8** (buton, select, input, rail ikonu, menü öğesi, ikon kutusu, segmented) · **`rounded-full`** (pill sekme, avatar) · **`rounded-lg` 16** (rail, ana yüzey, içerik kartı, banner, menü) · `rounded-[12px]` araç başlık kartı · `rounded-xs` 4 meta chip. Başka `rounded-[Npx]` yasak.
- **Gölge yok** (`shadow-*` sınıflarını kartlardan sil). Yalnızca overlay'ler `shadow-overlay` (Dialog/Menu zaten uygular).
- Motion: `transition-colors duration-fast`.

## 4. Bileşenler (src/components/ui — zaten Magnific App)
- **Button**: `primary` siyah (varsayılan; sayfa aksiyonu "+ Create", "+ Add", Generate) · `brand` pembe (yalnızca global oluştur) · `outline` kenarlıklı beyaz ("Share", "Cancel") · `secondary` %5 gri dolgu kenarlıksız (chip benzeri ikincil) · `ghost` ("See all ›") · `info` mavi pill · `danger` · `danger-outline` · `link` (pembe metin). Size: `md` 32 varsayılan; `lg` 40 yalnızca tam genişlik Generate (`fullWidth`); `icon`/`icon-sm`. `loading` prop'u var. İkon 16px, sağda "›" varsa `ChevronRight`. Generate'in sağında ✦ `Sparkles`.
- **Ekranda tek siyah primary.** Pembe yalnızca kabukta.
- **Input / Select**: kenarlıksız %5 gri dolgu, h32, 12/500, odakta mavi 1px — override'ları sil (`bg-card border …`, `h-11`, `rounded-xl`). **Textarea / prompt alanı**: beyaz kutu + 1px border, odakta mavi; `text-body-md`.
- **Label** artık varsayılan olarak **bölüm etiketi** (10px UPPERCASE #616161). Her kontrol grubunun üstünde `<Label>` (ör. MODEL, ASPECT RATIO, PROMPT); sağda isteğe bağlı sayaç `text-caption`.
- **Badge** varsayılan = **meta chip** (h24, r4, 1px border, %5 dolgu, 12/400: "16:9", "1K", "Flash"). `brand` pembe pill ("New"). Durum için `success`/`danger`/`warning`/`info`.
- **Tabs** = pill tabs (gri ray, etkin beyaz pill). Elle yazılmış sekmeler için `.pill-tabs` + `.pill-tab` (aria-selected / aria-pressed ile etkin).
- **Segmented filtre** (All / Private / Shared): `.segmented` + `.segmented-item` (aria-pressed). 
- **Card**: `bg-card rounded-lg p-4 md:p-7` — kenarlık/gölge yok. Kart içinde kart gerekiyorsa iç kart `bg-app rounded-[12px]` (ton farkı).
- **Seçilebilir seçenek kartı** (pack type, glasses, visual style): `bg-control hover:bg-control-hover rounded-md`, seçili `bg-active ring-1 ring-foreground/80`; `aria-pressed`/`aria-checked`.
- **Liste öğesi / sidebar öğesi**: `nav-item` sınıfı (h32, r8, 12/500, #616161; etkin gri zemin + koyu metin) veya `min-h-control-md px-3 rounded-md hover:bg-control aria-[current]:bg-active`.
- **Referans / yükleme kutusu**: `.dropzone size-[65px]` (ikon + 12px etiket) veya büyük alan için `.dropzone p-6` (ikon 20px, `text-label-md` etiket, `text-caption` yardım).
- **Meta chip / parametre chip'i**: Badge varsayılan veya `.meta-chip`.
- **Araç başlık kartı**: `rounded-[12px] px-3 py-2 bg-cat-image/10` + ikon `text-cat-image` + araç adı `text-heading-sm` (+ ⓘ) — araç sayfalarının panel üstü.
- **Empty state**: ortalanmış; `size-5`/`size-6` çizgi ikon (`text-muted-foreground`), başlık `text-heading-md`, tek satır açıklama `text-body-sm text-muted-foreground`. **Buton koyma**; aksiyon sayfa başlığındaki siyah butondur.
- **Skeleton**: `.skeleton` (gri dolgu, shimmer). Spinner yalnızca yapı bilinmiyorsa.
- **Menü**: Dropdown zaten r16 + çok katmanlı gölge; öğe h32 r8 12/400.

## 5. Sayfa kalıpları (Bölüm 6 / 7)
- **Araç sayfası** (Pack Creator, Bulk Generator, Text to Image, Prompt, Quote, Glasses): `flex` → **sol panel `w-tool-panel` (300px, iç 288)** `bg-card rounded-lg p-3 overflow-y-auto` ile yukarıdan aşağıya: araç başlık kartı → `BÖLÜM ETİKETİ` + kontroller (select'ler tam genişlik h32; referans kutuları 65px yan yana; prompt alanı beyaz) → **altta tam genişlik siyah Generate (`size="lg" fullWidth`, sağda ✦)**. Sağda **sonuç akışı**: `bg-background` üstünde zamana/promp'a göre gruplar; grup = `bg-app rounded-lg p-4` blok: başlık satırı (prompt özeti tek satır `truncate text-label-md`) + sağda meta chip'ler + `text-caption` göreli zaman; altında görsel ızgarası (`rounded-md` görseller). Mobilde panel üstte (tam genişlik), sonuçlar altta; Generate sticky altta.
  - Sayfanın mevcut yapısı buna uymuyorsa **JSX'i yeniden düzenle** (sarmalayıcıları değiştirmek serbest) ama tüm bileşen/handler'lar aynı kalsın.
- **Liste sayfası** (Packs, Styles, My Library, Usage): başlık satırı → solda `text-heading-md` sayfa adı + `text-body-sm text-muted-foreground` sayı; sağda **siyah "+ Create/Add/Upload"**, `.segmented` filtre, `outline` filtre butonu, arama Input (`bg-control`, başta `Search` ikonu, 32px). İçerik: beyaz kartlar `bg-card rounded-lg`, gölgesiz. Grid kartları ~190px, `rounded-[12px]`, kapak görsel, sol altta ad (beyaz kalın) overlay, sağ altta ⋮.
- **Panel listesi** (Packs listesi, Prompt projeleri): `bg-card` (kabuk sağlar) · üstte `text-heading-sm` başlık + `text-caption` sayı · `.pill-tabs` filtre · öğeler `nav-item` h32; grup başlıkları `text-overline`.
- **Top bar / sayfa başlığı**: Kabuk breadcrumb'ı zaten verir; sayfa içinde ayrıca büyük başlık + `border-b` çizgisi KULLANMA. Sayfa içi başlık gerekiyorsa `text-heading-md` + sağda aksiyonlar, çizgisiz.
- **Ayırıcı çizgiler**: `border-t/border-b` ile bölme yerine zemin farkı (`bg-app` blok) veya boşluk kullan. Sticky alt bar: `bg-background/95 backdrop-blur` çizgisiz.
- **Dialog**: başlık `text-heading-md`, metin `text-body-sm text-muted-foreground`, footer: `outline` İptal + `primary` (yıkıcı → `danger`).

## 6. Responsive / a11y
- Mobil kontrol yüksekliği 40 (`h-control-lg md:h-control-md` — Input/Select zaten yapar); dokunma hedefi ≥44 (`min-h-touch`).
- `fixed bottom-0` → `bottom-bottom-nav md:bottom-0` + `safe-bottom`.
- Hover-only aksiyonlar mobilde görünür: `opacity-100 md:opacity-0 md:group-hover:opacity-100 focus-within:opacity-100`.
- İkon-only buton → `aria-label` + Tooltip. Dekoratif ikon `aria-hidden`. İkon `strokeWidth={1.5}`, boyut `size-4` (buton/menü) · `size-5` (rail, empty state).

## 7. Doğrulama
`cd /home/claude/gemini-shot-creator && npx tsc -p tsconfig.app.json --noEmit` hatasız. `vite build` ÇALIŞTIRMA.
