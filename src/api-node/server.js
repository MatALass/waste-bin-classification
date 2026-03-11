const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const fetch = require("node-fetch");
const FormData = require("form-data");
const cors = require("cors");
const { Pool } = require("pg");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const SALT_ROUNDS = 10;
const PORT = Number(process.env.PORT || 3000);
const JWT_SECRET = process.env.JWT_SECRET;
const PYTHON_API_URL = process.env.PYTHON_API_URL || "http://localhost:5000";
const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  throw new Error("Missing required environment variable: DATABASE_URL");
}

if (!JWT_SECRET) {
  throw new Error("Missing required environment variable: JWT_SECRET");
}

const allowedOrigins = [
  "https://binwatch.vercel.app",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "http://localhost:5500",
  "http://127.0.0.1:5500",
  "null"
];

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const UPLOADS_DIR = path.join(__dirname, "uploads");
fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const app = express();

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: false
  })
);

app.options(/.*/, cors());

app.use("/uploads", express.static(UPLOADS_DIR));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

const storage = multer.diskStorage({
  destination: UPLOADS_DIR,
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
});

const upload = multer({ storage });

app.get("/health", async (req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({
      success: true,
      service: "binwatch-api",
      status: "ok",
      pythonApiUrl: PYTHON_API_URL
    });
  } catch (error) {
    console.error("[/health] DB error:", error);
    res.status(500).json({
      success: false,
      service: "binwatch-api",
      status: "error",
      error: "Database connection failed"
    });
  }
});

app.post("/register", async (req, res) => {
  let { prenom, nom, email, ville, password } = req.body;
  ville = (ville || "").trim() || "confidentiel";

  if (!prenom || !nom || !email || !password) {
    return res.status(400).json({
      success: false,
      error: "Champs requis manquants"
    });
  }

  try {
    const exists = await pool.query(
      "SELECT 1 FROM public.utilisateur WHERE email = $1",
      [email]
    );

    if (exists.rowCount > 0) {
      return res.status(409).json({
        success: false,
        error: "Email déjà utilisé"
      });
    }

    const hash = await bcrypt.hash(password, SALT_ROUNDS);

    const insertSQL = `
      INSERT INTO public.utilisateur (prenom, nom, email, ville, mot_de_passe)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id
    `;

    const { rows } = await pool.query(insertSQL, [prenom, nom, email, ville, hash]);
    const userId = rows[0].id;

    const token = jwt.sign({ userId, email, prenom, nom }, JWT_SECRET, {
      expiresIn: "7d"
    });

    return res.status(201).json({
      success: true,
      token,
      user: { id: userId, prenom, nom, email, ville }
    });
  } catch (error) {
    console.error("[/register] error:", error);
    return res.status(500).json({
      success: false,
      error: "Échec de l'inscription"
    });
  }
});

app.post("/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      error: "Email et mot de passe requis"
    });
  }

  try {
    const userRes = await pool.query(
      "SELECT id, prenom, nom, mot_de_passe, ville FROM public.utilisateur WHERE email = $1",
      [email]
    );

    if (userRes.rowCount === 0) {
      return res.status(401).json({
        success: false,
        error: "Identifiants invalides"
      });
    }

    const { id, prenom, nom, mot_de_passe: hash, ville } = userRes.rows[0];
    const match = await bcrypt.compare(password, hash);

    if (!match) {
      return res.status(401).json({
        success: false,
        error: "Identifiants invalides"
      });
    }

    const token = jwt.sign({ userId: id, email, prenom, nom }, JWT_SECRET, {
      expiresIn: "7d"
    });

    return res.json({
      success: true,
      token,
      user: { id, prenom, nom, email, ville }
    });
  } catch (error) {
    console.error("[/login] error:", error);
    return res.status(500).json({
      success: false,
      error: "Échec de connexion"
    });
  }
});

function auth(req, res, next) {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      error: "Token manquant"
    });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    return next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      error: "Token invalide"
    });
  }
}

app.post("/upload", upload.single("image"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      error: "Aucun fichier téléchargé"
    });
  }

  const localPath = `/uploads/${req.file.filename}`;
  const imagePath = path.join(UPLOADS_DIR, req.file.filename);
  const { annotation, location, date } = req.body;

  let pythonLabel;
  let pyFeat;

  try {
    const form = new FormData();
    form.append("image", fs.createReadStream(imagePath));

    const flaskResp = await fetch(`${PYTHON_API_URL}/classify`, {
      method: "POST",
      body: form,
      headers: form.getHeaders(),
      timeout: 30000
    });

    if (!flaskResp.ok) {
      throw new Error(`Python API responded ${flaskResp.status}`);
    }

    const json = await flaskResp.json();
    pythonLabel = json.label;
    pyFeat = json.features;
  } catch (error) {
    console.error("[/upload] classification error:", error);
    return res.status(502).json({
      success: false,
      error: "Classification d'image impossible"
    });
  }

  try {
    const insertImageSQL = `
      INSERT INTO public.image_features
        (path, file_size_kb, width, height, mean_r, mean_g, mean_b)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id
    `;

    const imageParams = [
      localPath,
      Math.round(pyFeat.size_kb),
      pyFeat.width,
      pyFeat.height,
      pyFeat.avg_r,
      pyFeat.avg_g,
      pyFeat.avg_b
    ];

    const imageResult = await pool.query(insertImageSQL, imageParams);
    const imageId = imageResult.rows[0]?.id || null;

    const insertHistorySQL = `
      INSERT INTO public.image_history
        (image_id, path, created_at, annotation, location, label)
      VALUES ($1, $2, $3, $4, $5, $6)
    `;

    await pool.query(insertHistorySQL, [
      imageId,
      localPath,
      date ? new Date(date) : new Date(),
      annotation || null,
      location || null,
      pythonLabel
    ]);
  } catch (error) {
    console.error("[/upload] DB insert error:", error);
  }

  return res.json({
    success: true,
    imageUrl: localPath,
    label: pythonLabel,
    features: pyFeat
  });
});

app.get("/history", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT h.path, h.created_at, h.annotation, h.location, h.label
      FROM public.image_history h
      ORDER BY h.created_at DESC
      LIMIT 100
    `);

    return res.json(result.rows);
  } catch (error) {
    console.error("[/history] DB error:", error);
    return res.status(500).json({
      success: false,
      error: "Erreur de lecture de la base"
    });
  }
});

app.get("/me/city", auth, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT ville FROM public.utilisateur WHERE id = $1",
      [req.user.userId]
    );

    const ville = result.rows[0]?.ville || null;

    return res.json({
      success: true,
      ville
    });
  } catch (error) {
    console.error("[/me/city] error:", error);
    return res.status(500).json({
      success: false,
      error: "Erreur serveur"
    });
  }
});

app.get("/api/seuils", async (req, res) => {
  try {
    const pythonRes = await fetch(`${PYTHON_API_URL}/api/seuils`);

    if (!pythonRes.ok) {
      throw new Error(`Python API responded ${pythonRes.status}`);
    }

    const json = await pythonRes.json();
    return res.json(json);
  } catch (error) {
    console.error("[/api/seuils] proxy error:", error);
    return res.status(500).json({
      success: false,
      error: "Erreur proxy seuils"
    });
  }
});

app.post("/api/seuils", async (req, res) => {
  try {
    const pythonRes = await fetch(`${PYTHON_API_URL}/api/seuils`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(req.body)
    });

    if (!pythonRes.ok) {
      throw new Error(`Python API responded ${pythonRes.status}`);
    }

    const json = await pythonRes.json();
    return res.json(json);
  } catch (error) {
    console.error("[/api/seuils] update proxy error:", error);
    return res.status(500).json({
      success: false,
      error: "Erreur proxy mise à jour seuils"
    });
  }
});

app.post("/api/seuils/reset", async (req, res) => {
  try {
    const pythonRes = await fetch(`${PYTHON_API_URL}/api/seuils/reset`, {
      method: "POST"
    });

    if (!pythonRes.ok) {
      throw new Error(`Python API responded ${pythonRes.status}`);
    }

    const json = await pythonRes.json();
    return res.json(json);
  } catch (error) {
    console.error("[/api/seuils/reset] proxy error:", error);
    return res.status(500).json({
      success: false,
      error: "Erreur proxy seuils reset"
    });
  }
});

app.get("/history/by-city", auth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT ville FROM public.utilisateur WHERE id = $1",
      [req.user.userId]
    );

    const ville = rows[0]?.ville || "";

    if (!ville) {
      return res.json([]);
    }

    const hist = await pool.query(
      `
      SELECT h.path, h.created_at, h.annotation, h.location, h.label
      FROM public.image_history h
      WHERE LOWER(h.location) LIKE LOWER($1)
      ORDER BY h.created_at DESC
      LIMIT 100
      `,
      [`%${ville}%`]
    );

    return res.json(hist.rows);
  } catch (error) {
    console.error("[/history/by-city] error:", error);
    return res.status(500).json({
      success: false,
      error: "Erreur serveur"
    });
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`BinWatch API running on port ${PORT}`);
});