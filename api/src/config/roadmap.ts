import type { Subject } from './game';
import { mathRoadmapNodes } from './mathRoadmap';
import { socialRoadmapNodes } from './socialRoadmap';

/** Тогтмол roadmap-тай хичээлүүд (математик, нийгэм судлал); бусад нь номын «Гарчиг»-аас. */
export const roadmapNodes = (subject: Subject, grade: number) =>
  subject === 'math' ? mathRoadmapNodes(grade) : subject === 'social' ? socialRoadmapNodes(grade) : [];
