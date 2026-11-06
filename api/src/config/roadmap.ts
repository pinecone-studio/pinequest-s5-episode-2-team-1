import type { Subject } from './game';
import { englishRoadmapNodes } from './englishRoadmap';
import { mathRoadmapNodes } from './mathRoadmap';
import { physicsRoadmapNodes } from './physicsRoadmap';
import { socialRoadmapNodes } from './socialRoadmap';

/** Тогтмол roadmap-тай хичээлүүд (математик, физик, нийгэм судлал, англи хэл); бусад нь номын «Гарчиг»-аас. */
export const roadmapNodes = (subject: Subject, grade: number) =>
  subject === 'math'
    ? mathRoadmapNodes(grade)
    : subject === 'social'
      ? socialRoadmapNodes(grade)
      : subject === 'english'
        ? englishRoadmapNodes(grade)
        : subject === 'physics'
          ? physicsRoadmapNodes(grade)
          : [];
