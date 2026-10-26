# Certificate fonts (optional)

Put these free fonts (SIL Open Font License) here to make certificate PDFs for
names in Urdu / Arabic script and Hindi / Devanagari. Without them, those
certificates are printed from the browser instead (Print / Save as PDF on the
certificate page).

| File | Script | Download |
| --- | --- | --- |
| `NotoNaskhArabic-Regular.ttf`, `NotoNaskhArabic-Bold.ttf` | Urdu, Arabic, Persian | https://fonts.google.com/noto/specimen/Noto+Naskh+Arabic |
| `NotoSansDevanagari-Regular.ttf`, `NotoSansDevanagari-Bold.ttf` | Hindi, Marathi, Nepali | https://fonts.google.com/noto/specimen/Noto+Sans+Devanagari |

Use the static `.ttf` files (in the download's `static/` folder), named exactly
as above. Bold is optional: without it, the regular file is used. To keep the
fonts somewhere else, set `CERTIFICATE_FONTS_DIR` in `server/.env`.
