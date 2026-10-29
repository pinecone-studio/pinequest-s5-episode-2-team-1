-- Уул (ангийн баг): ангийнхан нэг Ууланд нэгдэнэ. name = нэрийн эхний хэсэг ("Төгсбилэгийн"), апп ард нь " Уул" нэмнэ.
-- code: 6 оронтой урилгын код (кодыг мэдэх хүн нэгдэнэ, эзэн нь солино). owner_id: Уулын эзэн (нэр солих, гишүүн хасах).
-- clan_members: user_id нь PRIMARY KEY тул нэг хүүхэд нэг л Ууланд байна. Гишүүний дээд тоо (40)-г INSERT-ийн нөхцөлөөр шалгана.
CREATE TABLE clans (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT    NOT NULL,
  code       TEXT    NOT NULL UNIQUE,
  owner_id   INTEGER NOT NULL REFERENCES users(id),
  created_at INTEGER NOT NULL
);

CREATE TABLE clan_members (
  user_id   INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  clan_id   INTEGER NOT NULL REFERENCES clans(id) ON DELETE CASCADE,
  joined_at INTEGER NOT NULL
);
CREATE INDEX idx_clan_members_clan ON clan_members(clan_id, joined_at);
