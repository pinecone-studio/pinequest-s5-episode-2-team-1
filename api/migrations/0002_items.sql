-- Avatar-ын дэлгүүрийн эд зүйлс (20). price = 0 бол бүх хүнд анхнаасаа байгаа.
-- style.shape-ийг клиентийн Avatar компонент зурна; color/trim нь өнгө.

INSERT INTO items (id, slot, name, price, min_level, style, sort) VALUES
  ('skin_light',           'skin',      'Цайвар арьс',        0,   1, '{"shape":"base","color":"#F9D7BE"}', 1),
  ('skin_tan',             'skin',      'Шаргал арьс',        0,   1, '{"shape":"base","color":"#E2A97E"}', 2),
  ('skin_brown',           'skin',      'Бор арьс',           0,   1, '{"shape":"base","color":"#A86B47"}', 3),

  ('hair_short_black',     'hair',      'Богино хар үс',      0,   1, '{"shape":"short","color":"#2A2522"}', 10),
  ('hair_long_brown',      'hair',      'Урт бор үс',         20,  1, '{"shape":"long","color":"#6B4226"}', 11),
  ('hair_bun_black',       'hair',      'Боодолтой үс',       35,  2, '{"shape":"bun","color":"#1F1B18"}', 12),
  ('hair_spiky_blue',      'hair',      'Сэрвэгэр цэнхэр үс', 60,  3, '{"shape":"spiky","color":"#3B82F6"}', 13),

  ('top_tshirt_blue',      'top',       'Цэнхэр футболк',     0,   1, '{"shape":"tshirt","color":"#60A5FA"}', 20),
  ('top_tshirt_red',       'top',       'Улаан футболк',      15,  1, '{"shape":"tshirt","color":"#EF4444"}', 21),
  ('top_hoodie_green',     'top',       'Ногоон худи',        40,  2, '{"shape":"hoodie","color":"#22C55E"}', 22),
  ('top_deel_blue',        'top',       'Цэнхэр дээл',        80,  3, '{"shape":"deel","color":"#1D4ED8","trim":"#FACC15"}', 23),

  ('bottom_pants_navy',    'bottom',    'Хар хөх өмд',        0,   1, '{"shape":"pants","color":"#1E3A8A"}', 30),
  ('bottom_shorts_khaki',  'bottom',    'Богино өмд',         15,  1, '{"shape":"shorts","color":"#B08D57"}', 31),
  ('bottom_skirt_pink',    'bottom',    'Ягаан банзал',       25,  1, '{"shape":"skirt","color":"#EC4899"}', 32),

  ('shoes_sneakers_white', 'shoes',     'Цагаан пүүз',        0,   1, '{"shape":"sneakers","color":"#F3F4F6"}', 40),
  ('shoes_gutal',          'shoes',     'Монгол гутал',       50,  2, '{"shape":"gutal","color":"#7C2D12","trim":"#F59E0B"}', 41),

  ('acc_glasses',          'accessory', 'Нүдний шил',         20,  1, '{"shape":"glasses","color":"#111827"}', 50),
  ('acc_cap_red',          'accessory', 'Улаан малгай',       30,  1, '{"shape":"cap","color":"#DC2626"}', 51),
  ('acc_headphones',       'accessory', 'Чихэвч',             45,  2, '{"shape":"headphones","color":"#8B5CF6"}', 52),
  ('acc_crown',            'accessory', 'Алтан титэм',        120, 4, '{"shape":"crown","color":"#FBBF24"}', 53);
