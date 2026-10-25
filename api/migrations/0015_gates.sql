-- 2-р бүлэгт boss-ын өмнө зүүн гар (29), баруун гар (30) хаалга нэмэгдсэн (GAME.BOSS.GATES = 15, 29, 30, 31, 47):
-- subject_progress.bosses_beaten нь одоо давсан хаалганы тоо. Хуучин утга (ялсан boss) → хаалга: 2-р boss-ыг ялсан
-- бол түүний гарууд ч давсан тооцогдоно (2 → 4, 3 → 5).
UPDATE subject_progress SET bosses_beaten = CASE bosses_beaten WHEN 2 THEN 4 WHEN 3 THEN 5 ELSE bosses_beaten END;
