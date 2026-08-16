CREATE TABLE "user" (
  id            TEXT PRIMARY KEY,
  name          TEXT,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'USER',
  created_at    TEXT NOT NULL
);

CREATE TABLE artist (
  id           TEXT PRIMARY KEY,
  name         TEXT NOT NULL UNIQUE,
  bio          TEXT,
  artwork_path TEXT,
  created_at   TEXT NOT NULL
);

CREATE TABLE album (
  id           TEXT PRIMARY KEY,
  title        TEXT NOT NULL,
  artist_id    TEXT NOT NULL REFERENCES artist(id) ON DELETE CASCADE,
  artwork_path TEXT,
  created_at   TEXT NOT NULL
);

CREATE TABLE song (
  id           TEXT PRIMARY KEY,
  title        TEXT NOT NULL,
  artist_id    TEXT REFERENCES artist(id) ON DELETE SET NULL,
  album_id     TEXT REFERENCES album(id) ON DELETE SET NULL,
  audio_path   TEXT NOT NULL,
  artwork_path TEXT,
  duration     REAL NOT NULL DEFAULT 0,
  genre        TEXT,
  release_date TEXT,
  track_number INTEGER,
  disc_number  INTEGER,
  description  TEXT,
  lyric        TEXT,
  play_count   INTEGER NOT NULL DEFAULT 0,
  created_at   TEXT NOT NULL,
  updated_at   TEXT NOT NULL
);

CREATE TABLE playlist (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  description TEXT,
  user_id     TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  created_at  TEXT NOT NULL
);

CREATE TABLE playlist_track (
  id          TEXT PRIMARY KEY,
  playlist_id TEXT NOT NULL REFERENCES playlist(id) ON DELETE CASCADE,
  song_id     TEXT NOT NULL REFERENCES song(id) ON DELETE CASCADE,
  position    INTEGER NOT NULL,
  added_at    TEXT NOT NULL,
  UNIQUE (playlist_id, position)
);

CREATE TABLE likes (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  song_id    TEXT NOT NULL REFERENCES song(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL,
  UNIQUE (user_id, song_id)
);

CREATE TABLE recently_played (
  id        TEXT PRIMARY KEY,
  user_id   TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  song_id   TEXT NOT NULL REFERENCES song(id) ON DELETE CASCADE,
  played_at TEXT NOT NULL
);

CREATE INDEX idx_song_artist ON song(artist_id);
CREATE INDEX idx_song_album  ON song(album_id);
CREATE INDEX idx_song_created ON song(created_at);
CREATE INDEX idx_song_plays   ON song(play_count);
CREATE INDEX idx_playlist_user ON playlist(user_id);
CREATE INDEX idx_track_playlist ON playlist_track(playlist_id);
CREATE INDEX idx_track_position ON playlist_track(playlist_id, position);
CREATE INDEX idx_likes_user ON likes(user_id, created_at);
CREATE INDEX idx_recent_user ON recently_played(user_id, played_at);