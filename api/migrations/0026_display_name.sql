-- Профайлын нэр (хоч): бүртгүүлсний дараа баавгайгаа тохируулахдаа өгнө. NULL бол username харагдана.
-- Баавгайн үс, царай, цээжний толбо нь bear_look JSON-д (bg, outfit-ийн хажууд) хадгалагдана.
ALTER TABLE users ADD COLUMN display_name TEXT;
