// بيقرا ملف .env (لو موجود) قبل أي ملف تاني — لازم يتعمله import أول سطر في index.js
import fs from "node:fs";
const f = new URL("../.env", import.meta.url);
if (fs.existsSync(f)) process.loadEnvFile(f);
