require("dotenv").config();
const express = require("express");
const session = require("express-session");
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcrypt");

const app = express();
const prisma = new PrismaClient();

const PUBLIC_DIR = path.join(__dirname, "public");
const UPLOAD_DIR = path.join(PUBLIC_DIR, "uploads");
const BACKUP_DIR = path.join(__dirname, "backups");
[PUBLIC_DIR, UPLOAD_DIR, BACKUP_DIR].forEach((d) => {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
});

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) =>
    cb(null, Date.now() + "-" + Math.round(Math.random() * 1e9) + "-" + file.originalname),
});
const upload = multer({ storage });

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use("/public", express.static(PUBLIC_DIR));
app.use(express.static(PUBLIC_DIR));

app.use(
  session({
    secret: process.env.SESSION_SECRET || "super-secret-xmas",
    resave: false,
    saveUninitialized: false,
  })
);

function ensureAuth(req, res, next) {
  if (!req.session.user) return res.redirect("/login");
  next();
}
function isAdmin(u) {
  return u && u.role === "admin";
}
async function doBackup() {
  try {
    const users = await prisma.user.findMany();
    const entries = await prisma.entry.findMany();
    const payload = { createdAt: new Date().toISOString(), users, entries };
    fs.writeFileSync(
      path.join(BACKUP_DIR, "backup-" + Date.now() + ".json"),
      JSON.stringify(payload, null, 2)
    );
    const dbUrl = process.env.DATABASE_URL || "";
    if (dbUrl.startsWith("file:")) {
      const dbPath = dbUrl.replace("file:", "");
      const abs = path.join(__dirname, dbPath);
      if (fs.existsSync(abs)) {
        fs.copyFileSync(abs, path.join(BACKUP_DIR, "sqlite-" + Date.now() + ".db"));
      }
    }
  } catch (e) {
    console.error("Backup failed:", e.message);
  }
}

app.get("/", (req, res) => {
  if (!req.session.user) return res.redirect("/login");
  if (req.session.user.role === "admin") return res.redirect("/admin");
  return res.redirect("/calendar");
});

app.get("/login", (req, res) => {
  res.render("login", { error: null });
});

app.post("/login", async (req, res) => {
  const { username, password } = req.body;
  const user = await prisma.user.findUnique({ where: { username } });
  if (!user) return res.render("login", { error: "Nieprawidłowy login lub hasło" });
  const ok = await bcrypt.compare(password, user.password);
  if (!ok) return res.render("login", { error: "Nieprawidłowy login lub hasło" });
  req.session.user = { id: user.id, username: user.username, role: user.role };
  if (user.role === "admin") return res.redirect("/admin");
  return res.redirect("/calendar");
});

app.get("/logout", (req, res) => {
  req.session.destroy(() => res.redirect("/login"));
});

app.get("/calendar", ensureAuth, async (req, res) => {
  const user = req.session.user;
  const otherUser = await prisma.user.findFirst({
    where: {
      NOT: { id: user.id },
      role: { not: "admin" },
    },
  });
  let entries = [];
  if (otherUser) {
    entries = await prisma.entry.findMany({
      where: { authorId: otherUser.id },
    });
  }
  res.render("calendar", {
    user,
    entries,
    today: new Date().getDate(),
  });
});

app.get("/day/:day", ensureAuth, async (req, res) => {
  const user = req.session.user;
  const day = parseInt(req.params.day, 10);
  const otherUser = await prisma.user.findFirst({
    where: {
      NOT: { id: user.id },
      role: { not: "admin" },
    },
  });
  let entry = null;
  if (otherUser) {
    entry = await prisma.entry.findUnique({
      where: {
        authorId_day: {
          authorId: otherUser.id,
          day,
        },
      },
    });
  }
  res.render("day", { user, day, entry });
});

app.get("/fill", ensureAuth, async (req, res) => {
  const user = req.session.user;
  if (user.role === "admin") return res.redirect("/admin");
  const entries = await prisma.entry.findMany({
    where: { authorId: user.id },
  });
  res.render("fill", { user, entries });
});

app.post(
  "/fill",
  ensureAuth,
  upload.fields([
    { name: "image", maxCount: 1 },
    { name: "video", maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      const user = req.session.user;
      const day = parseInt(req.body.day, 10);
      const text = req.body.text || null;
      const song = req.body.song || null;

      const files = req.files || {};
      const imageFile = Array.isArray(files.image) ? files.image[0] : null;
      const videoFile = Array.isArray(files.video) ? files.video[0] : null;

      const data = {
        day,
        text,
        songLink: song,
        authorId: user.id,
      };
      if (imageFile) data.imageUrl = "/public/uploads/" + imageFile.filename;
      if (videoFile) data.videoUrl = "/public/uploads/" + videoFile.filename;

      await prisma.entry.upsert({
        where: {
          authorId_day: {
            authorId: user.id,
            day,
          },
        },
        update: data,
        create: data,
      });

      await doBackup();

      res.redirect("/calendar");
    } catch (err) {
      console.error("Błąd /fill:", err);
      res.status(500).send("Błąd podczas zapisu okienka.");
    }
  }
);

app.post("/fill/delete-section", ensureAuth, async (req, res) => {
  try {
    const user = req.session.user;
    const { day, section } = req.body;
    const dayNum = parseInt(day, 10);
    const entry = await prisma.entry.findUnique({
      where: { authorId_day: { authorId: user.id, day: dayNum } },
    });
    if (!entry) return res.json({ ok: true });

    const data = {};
    if (section === "text") data.text = null;
    else if (section === "image") data.imageUrl = null;
    else if (section === "song") data.songLink = null;
    else if (section === "video") data.videoUrl = null;
    else return res.status(400).json({ ok: false, error: "Bad section" });

    await prisma.entry.update({
      where: { id: entry.id },
      data,
    });

    if ((section === "image" && entry.imageUrl) || (section === "video" && entry.videoUrl)) {
      const fileUrl = section === "image" ? entry.imageUrl : entry.videoUrl;
      const rel = fileUrl.replace("/public/", "public/");
      const abs = path.join(__dirname, rel);
      if (fs.existsSync(abs)) {
        try {
          fs.unlinkSync(abs);
        } catch (e) {
          console.error("Nie udało się usunąć pliku:", abs, e.message);
        }
      }
    }

    await doBackup();

    res.json({ ok: true });
  } catch (e) {
    console.error("delete-section error:", e);
    res.status(500).json({ ok: false });
  }
});

app.get("/change-password", ensureAuth, (req, res) => {
  res.render("change-password", { user: req.session.user, error: null, success: null });
});

app.post("/change-password", ensureAuth, async (req, res) => {
  const { currentPassword, newPassword, confirmPassword } = req.body;
  const sessUser = req.session.user;
  const dbUser = await prisma.user.findUnique({ where: { id: sessUser.id } });
  if (!dbUser) return res.redirect("/login");

  if (!currentPassword || !newPassword || !confirmPassword) {
    return res.render("change-password", { user: sessUser, error: "Uzupełnij wszystkie pola.", success: null });
  }
  const ok = await bcrypt.compare(currentPassword, dbUser.password);
  if (!ok) {
    return res.render("change-password", { user: sessUser, error: "Obecne hasło jest nieprawidłowe.", success: null });
  }
  if (newPassword !== confirmPassword) {
    return res.render("change-password", { user: sessUser, error: "Nowe hasła nie są takie same.", success: null });
  }
  if (newPassword.length < 6) {
    return res.render("change-password", { user: sessUser, error: "Hasło musi mieć min. 6 znaków.", success: null });
  }

  const hashed = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({
    where: { id: dbUser.id },
    data: { password: hashed },
  });

  await doBackup();

  res.render("change-password", { user: sessUser, error: null, success: "Hasło zostało zmienione ✅" });
});

app.get("/admin", ensureAuth, async (req, res) => {
  const user = req.session.user;
  if (!isAdmin(user)) return res.redirect("/calendar");
  const users = await prisma.user.findMany();
  const entries = await prisma.entry.findMany({ include: { author: true } });
  res.render("admin", { user, users, entries });
});

app.post("/admin/reset-entry", ensureAuth, async (req, res) => {
  const user = req.session.user;
  if (!isAdmin(user)) return res.redirect("/calendar");
  const { userId, day } = req.body;
  await prisma.entry.deleteMany({
    where: {
      authorId: parseInt(userId, 10),
      day: parseInt(day, 10),
    },
  });
  await doBackup();
  res.redirect("/admin");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("🎄 Wyzwanie Świąteczne 2025 działa na porcie", PORT);
});

/* ===== EMAIL PANEL API v20.2 ===== */
try {
  const { SESClient, SendEmailCommand } = require('@aws-sdk/client-ses');
  const SES_REGION = process.env.SES_REGION || 'eu-central-1';
  const EMAIL_FROM = process.env.EMAIL_FROM || '';
  const EMAILS = {
    jacek: process.env.EMAIL_TO_JACEK || '',
    stefania: process.env.EMAIL_TO_STEFANIA || ''
  };
  const ses = new SESClient({ region: SES_REGION });

  function prettyName(u){ if(!u) return ''; return u.charAt(0).toUpperCase()+u.slice(1).toLowerCase(); }
  function otherUserName(u){ const n=(u||'').toLowerCase(); if(n==='jacek') return 'Stefania'; if(n==='stefania') return 'Jacek'; return 'Przyjaciel'; }
  function genderVerbByOther(other){ const o=(other||'').toLowerCase(); return (o==='stefania') ? 'przygotowała' : 'przygotował'; }

  function mkEmailContent(username, override){
    const recipient = prettyName(username);
    const other = otherUserName(username);
    const verb = genderVerbByOther(other);
    const subject = `Hej ${recipient} 🎄 — Wyzwanie Świąteczne 2025`;
    const body = override && override.trim()
      ? override.trim()
      : `Hej ${recipient} 🎄
      
Nowy dzień to nowe wyzwanie — dodaj kolejne wpisy i sprawdź, co ${other} ${verb} dla Ciebie na dzisiaj.
Miłego dnia ❤️

https://swiateczna.pracunia.pl/calendar`;
    const html = body.replace(/\n/g, '<br/>');
    return { subject, text: body, html };
  }

  async function sendEmail(toEmail, subject, text, html){
    if (!EMAIL_FROM || !toEmail) throw new Error('Missing EMAIL_FROM or recipient');
    const input = {
      Source: EMAIL_FROM,
      Destination: { ToAddresses: [toEmail] },
      Message: {
        Subject: { Data: subject, Charset: 'UTF-8' },
        Body: {
          Html: { Data: html, Charset: 'UTF-8' },
          Text: { Data: text, Charset: 'UTF-8' }
        }
      }
    };
    const cmd = new SendEmailCommand(input);
    return await ses.send(cmd);
  }

  // Admin AJAX endpoint
  app.post('/admin/api/send-email-test', express.json(), async (req,res)=>{
    try {
      if (!req.session || !req.session.user || req.session.user.username !== 'admin') {
        return res.status(403).json({ ok:false, error:'forbidden' });
      }
      const username = (req.body.username||'').toLowerCase();
      const custom = (req.body.custom||'').trim();
      if (!['jacek','stefania'].includes(username)) return res.status(400).json({ ok:false, error:'bad_username' });
      const to = EMAILS[username];
      if (!to) return res.status(400).json({ ok:false, error:'missing_recipient' });
      const { subject, text, html } = mkEmailContent(username, custom);
      const r = await sendEmail(to, subject, text, html);
      return res.json({ ok:true, messageId: r && r.MessageId });
    } catch (e) {
      console.error('[email panel api] error', e && e.message);
      return res.status(500).json({ ok:false, error:'server_error' });
    }
  });

  console.log('[email] Panel API v20.2 aktywne');
} catch (e) {
  console.error('[email] panel api init error', e);
}
/* ===== /EMAIL PANEL API v20.2 ===== */

/* ===== ADMIN PANEL v20.3 ===== */
try {
  app.get('/admin/panel', (req,res)=>{
    if (!req.session || !req.session.user || req.session.user.username !== 'admin') return res.status(403).send('Forbidden');
    return res.render('admin-panel', { user: req.session.user, entries: [] });
  });
  console.log('[admin] /admin/panel dostępny');
} catch (e) {
  console.error('[admin panel] init error', e);
}
/* ===== /ADMIN PANEL v20.3 ===== */

/* ===== ADMIN PANEL v20.5 ===== */
try {
  const fs = require('fs');
  const path = require('path');
  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient();

  function isAdmin(req){ return req.session && req.session.user && req.session.user.username === 'admin'; }

  app.get('/admin/panel', async (req,res)=>{
    if (!isAdmin(req)) return res.status(403).send('Forbidden');
    const users = [{ username:'jacek' }, { username:'stefania' }];
    return res.render('admin-panel', { user: req.session.user, users });
  });

  // Helpers (ostrożne, odporne na różne nazwy modeli/kolumn)
  async function getUserByUsername(username){
    try {
      if (prisma.user && prisma.user.findFirst) {
        return await prisma.user.findFirst({ where: { username: username.toLowerCase() }});
      }
    } catch {}
    try {
      if (prisma.users && prisma.users.findFirst) {
        return await prisma.users.findFirst({ where: { username: username.toLowerCase() }});
      }
    } catch {}
    return null;
  }

  async function softDeleteFilesFromEntries(entries){
    for (const e of entries){
      const maybePaths = [];
      if (e.imagePath) maybePaths.push(e.imagePath);
      if (e.imageUrl) maybePaths.push(e.imageUrl);
      if (e.videoPath) maybePaths.push(e.videoPath);
      if (e.videoUrl) maybePaths.push(e.videoUrl);
      for (let pth of maybePaths){
        try {
          if (typeof pth !== 'string' || !pth) continue;
          if (!pth.startsWith('/')) {
            // spróbuj w uploads/
            const candidates = [
              path.join(process.cwd(), 'uploads', pth),
              path.join(process.cwd(), 'uploads', 'images', pth),
              path.join(process.cwd(), 'uploads', 'videos', pth),
              path.join(process.cwd(), 'public', pth),
            ];
            for (const c of candidates){
              try { if (fs.existsSync(c)) fs.unlinkSync(c); } catch {}
            }
          } else {
            if (fs.existsSync(pth)) fs.unlinkSync(pth);
          }
        } catch {}
      }
    }
  }

  async function deleteDayEntries(username, day){
    const user = await getUserByUsername(username);
    if (!user) return { ok:false, error:'user_not_found' };
    const models = ['adventEntry', 'entry', 'dayEntry'];
    let total = 0;
    for (const m of models){
      const model = prisma[m];
      if (!model) continue;
      // spróbuj różne powiązania
      const whereCandidates = [
        { day: Number(day), recipientId: user.id },
        { day: Number(day), userId: user.id },
        { day: Number(day), ownerId: user.id },
      ];
      let deleted = 0;
      // spróbuj deleteMany
      for (const w of whereCandidates){
        try {
          const r = await model.deleteMany({ where: w });
          if (r && typeof r.count === 'number') { deleted += r.count; break; }
        } catch {}
      }
      if (deleted === 0){
        // spróbuj nullować pola + usuwać pliki
        for (const w of whereCandidates){
          try {
            const found = await model.findMany({ where: w });
            if (found && found.length){
              await softDeleteFilesFromEntries(found);
              for (const it of found){
                try {
                  await model.update({ where: { id: it.id }, data: { text: null, imagePath: null, imageUrl: null, songLink: null, videoPath: null, videoUrl: null } });
                  deleted++;
                } catch {}
              }
              break;
            }
          } catch {}
        }
      }
      total += deleted;
    }
    return { ok:true, removed: total };
  }

  async function deleteAllEntries(username){
    const user = await getUserByUsername(username);
    if (!user) return { ok:false, error:'user_not_found' };
    const models = ['adventEntry', 'entry', 'dayEntry'];
    let total = 0;
    for (const m of models){
      const model = prisma[m];
      if (!model) continue;
      const whereCandidates = [
        { recipientId: user.id },
        { userId: user.id },
        { ownerId: user.id },
      ];
      let deleted = 0;
      for (const w of whereCandidates){
        try {
          const found = await model.findMany({ where: w });
          if (found && found.length){
            await softDeleteFilesFromEntries(found);
            try {
              const r = await model.deleteMany({ where: w });
              if (r && typeof r.count === 'number') deleted += r.count;
            } catch {}
          }
        } catch {}
      }
      total += deleted;
    }
    return { ok:true, removed: total };
  }

  app.post('/admin/api/delete-day', express.json(), async (req,res)=>{
    try {
      if (!isAdmin(req)) return res.status(403).json({ ok:false, error:'forbidden' });
      const { username, day } = req.body || {};
      if (!username || !day) return res.status(400).json({ ok:false, error:'missing_params' });
      const r = await deleteDayEntries(String(username), Number(day));
      return res.json(r);
    } catch (e) {
      console.error('[admin delete-day] error', e);
      return res.status(500).json({ ok:false, error:'server_error' });
    }
  });

  app.post('/admin/api/delete-all', express.json(), async (req,res)=>{
    try {
      if (!isAdmin(req)) return res.status(403).json({ ok:false, error:'forbidden' });
      const { username } = req.body || {};
      if (!username) return res.status(400).json({ ok:false, error:'missing_params' });
      const r = await deleteAllEntries(String(username));
      return res.json(r);
    } catch (e) {
      console.error('[admin delete-all] error', e);
      return res.status(500).json({ ok:false, error:'server_error' });
    }
  });

  console.log('[admin] v20.5 panel + delete API gotowe');
} catch (e) {
  console.error('[admin v20.5] init error', e);
}
/* ===== /ADMIN PANEL v20.5 ===== */
