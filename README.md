# OPEX 5S Baseline

Tarayıcıda çalışan, tek sayfa bir 5S operasyonel mükemmellik modülü başlangıç uygulaması.

## Kapsam
- 5S Saha Tanımlama (ağaç yapı, sorumluluk atamaları, ekipman yönetimi)
- İSG Değerlendirme (risk seviyesi + tek nokta eğitim kayıtları)
- Denetim (1S için 5 kategori puanlama + uygunsuzluk notları)

## Çalıştırma
```bash
python3 -m http.server 8080
```
Ardından `http://localhost:8080` adresini açın.

## Notlar
- Veriler `localStorage` içinde kalıcı tutulur.
- Personel seçimi için örnek veri `data/personnel.csv` dosyasındadır.
- Personel araması hem `Pers. No` hem `Adı Soyadı` ile çalışır.
