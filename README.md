# TechAvı V2

Sıfırdan hazırlanmış TechAvı sürümü.

## Özellikler

- Kullanıcı API key girişi yok.
- ReefAPI key sadece Render environment variable olarak sunucuda tutulur.
- Trendyol + Hepsiburada + n11 araması.
- Sunucu tarafı 10 dakikalık cache.
- Aynı sorgu tekrarlandığında mümkün olduğunca ReefAPI çağrısı yapılmaz.
- Üyelik: kayıt / giriş / çıkış.
- Kullanıcılar PostgreSQL'de kalıcı tutulur.
- Fiyat alarmı PostgreSQL'de tutulur.
- Hedef fiyata düşünce alarm tetiklenir.
- Resend ayarlıysa e-posta gönderilir; ayarlı değilse alarm hesabın içinde görünür.
- E-posta doğrulaması V1'de zorunlu değildir.
- n11 için kampanya/sepette indirim fiyatı önceliklendirilir.
- Mobil uyumlu arayüz.

## Gerekli Render değişkenleri

REEF_API_KEY
DATABASE_URL
SESSION_SECRET

Opsiyonel:

RESEND_API_KEY
RESEND_FROM
APP_URL

## Veritabanı

Bu proje PostgreSQL kullanır. Neon gibi ücretsiz bir PostgreSQL sağlayıcısından bir veritabanı oluşturup DATABASE_URL değerini Render'a koyabilirsin.

Render Free dosya sistemi kalıcı değildir; bu yüzden kullanıcılar ve alarmlar JSON dosyasında tutulmaz.

## Lokal çalıştırma

1. npm install
2. .env oluştur
3. npm start
4. http://localhost:10000

## Not

Render Free web service 15 dakika trafik olmazsa uyur ve sonraki istekte yaklaşık 1 dakika içinde tekrar başlar. Bu uygulama koduyla çözülemez; sürekli açık kalması için ücretli Render compute gerekir.

## TechAvı Pro özellikleri (v3)

Bu sürüm mevcut arama altyapısını koruyup aşağıdaki özellikleri ekler:
- 7 gün / 30 gün / 6 ay gerçek fiyat geçmişi ve çizgi grafik
- 30 günlük dip / tüm zamanların dip fiyat bilgisi
- fiyat düşüş yüzdesi ve fiyat kalitesi (iyi / normal / yüksek)
- aynı/benzer ürünlerde mağaza karşılaştırması
- hedef fiyat, yüzde düşüş, 30 gün dip ve stok alarmı
- favorilerin hesapla senkronizasyonu ve takip listesi
- alarm geçmişi ve bildirim merkezi
- son aramalar ve 30 günlük popüler aramalar
- kategori, fiyat, mağaza, marka, indirim, stok filtreleri
- en ucuz / pahalı / en çok düşen / en yüksek indirim sıralaması
- gerçek fırsatlar, fiyat düşüşleri, dip fiyatlar ve “Bugün ne düştü?”
- benzer ürünler ve ürün detay ekranı
- geliştirilmiş PWA/offline shell
- daha sağlam Web Push abonelik yenileme ve test akışı
- koyu/açık tema
- e-posta/şifre hesabı + opsiyonel Google ile giriş

### Yeni ortam değişkeni
Google ile giriş isteniyorsa Render'a `GOOGLE_CLIENT_ID` ekleyin. Google OAuth Web Client ID olmadan normal e-posta/şifre girişi çalışmaya devam eder ve Google düğmesi gösterilmez.

### Push için gerekli değişkenler
`VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `APP_URL`, `JOB_SECRET` ve `DATABASE_URL` ayarlı olmalıdır. Telefon push bildirimleri HTTPS üzerinde ve tarayıcı/site bildirim izni açıkken çalışır.

### Fiyat geçmişi hakkında
TechAvı sahte geçmiş üretmez. `price_history` tablosu ürün aramalarında ve alarm kontrollerinde gerçek gözlemlerle dolar. Bu nedenle yeni kurulumda grafik/fırsat listeleri zaman içinde zenginleşir.
