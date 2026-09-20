CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  refresh_token_hash TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);

CREATE TABLE IF NOT EXISTS meals (
  id TEXT NOT NULL,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT 'sparkle',
  sort_order INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, id)
);

CREATE TABLE IF NOT EXISTS foods (
  id TEXT NOT NULL,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  brand TEXT NOT NULL DEFAULT '',
  color TEXT NOT NULL DEFAULT 'mango',
  portions TEXT NOT NULL,
  default_portion_id TEXT NOT NULL DEFAULT '',
  nutrients TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, id)
);

CREATE TABLE IF NOT EXISTS log_entries (
  id TEXT NOT NULL,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  meal TEXT NOT NULL,
  food_id TEXT NOT NULL,
  portion_id TEXT NOT NULL DEFAULT '',
  quantity REAL NOT NULL DEFAULT 1,
  custom_grams REAL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, id)
);
CREATE INDEX IF NOT EXISTS idx_log_entries_user_date ON log_entries(user_id, date);

CREATE TABLE IF NOT EXISTS water_logs (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  ml REAL NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, date)
);

CREATE TABLE IF NOT EXISTS settings (
  user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  calorie_goal REAL NOT NULL DEFAULT 2000,
  protein_goal REAL NOT NULL DEFAULT 120,
  carbs_goal REAL NOT NULL DEFAULT 230,
  fat_goal REAL NOT NULL DEFAULT 65,
  water_goal_ml REAL NOT NULL DEFAULT 2500,
  name TEXT NOT NULL DEFAULT ''
);
