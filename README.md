# 🏠 מחשבון משכנתא חכם — מדריך פריסה

## מה בתיקייה?

```
mashkanta-site/
├── index.html       ← האפליקציה כולה
├── api/
│   └── chat.js      ← שרת ביניים (שומר על ה-API Key)
├── vercel.json      ← הגדרות Vercel
└── README.md        ← המדריך הזה
```

---

## שלב 1 — Google AI Key (חינמי, ללא כרטיס)

1. כנס ל־ https://aistudio.google.com
2. לחץ **Get API key** (כפתור כחול בראש הדף)
3. לחץ **Create API key in new project**
4. העתק את ה-Key: נראה כך ─ `AIzaSyXXXXXXXXXXXXXXXXX`

---

## שלב 2 — Vercel (חינמי, 3 דקות)

1. כנס ל־ https://vercel.com → **Sign Up with Google**
2. לחץ **Add New → Project**
3. גלול למטה ← לחץ **"Upload"** ← גרור את תיקיית `mashkanta-site`
4. לפני ה-Deploy ── פתח **Environment Variables** ← הוסף:
   - Name:  `GEMINI_API_KEY`
   - Value: `AIzaSyXXXXXX...`  ← ה-Key מסעיף 1
5. לחץ **Deploy** ✅

---

## שלב 3 — שלח לחברים!

```
https://mashkanta-XXXX.vercel.app
```

---

## עלויות

| שירות | עלות |
|---|---|
| Vercel | חינם |
| Google Gemini API | חינם עד 250 בקשות/יום |
| דומיין .co.il | אופציונלי, ~₪50/שנה |

---

*נבנה עם Claude · Anthropic 2026*
