import { useWindowDimensions } from 'react-native';

/** Том дэлгэц (tablet / web) дээр апп энэ өргөнтэй баганад голлоно (app/_layout.tsx). */
export const COLUMN_MAX_W = 430;

/**
 * Апп-ын баганын өргөн: утсан дээр цонхны өргөн, өргөн цонхонд 430. Дэлгэцийн дүрсийг цонхны өргөнөөр байрлуулбал
 * laptop-ын браузер дээр газрын зураг томорч, баавгай, сум баганаас гарна.
 */
export function useColumnWidth(): number {
  return Math.min(useWindowDimensions().width, COLUMN_MAX_W);
}
