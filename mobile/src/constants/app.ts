import brand from './brand.json';

/** Апп-ын түр нэр. `brand.json`-д солиход UI болон Expo Go дахь нэр хоёулаа солигдоно. */
export const APP_NAME: string = brand.appName;

/** "Шүүгчээр орох" товч. api/wrangler.jsonc-ийн JUDGE_LOGIN-тэй ижил байлгана (тэмцээний үеэр л "on"). */
export const JUDGE_LOGIN = false;
