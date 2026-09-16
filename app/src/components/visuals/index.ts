// Enregistre les 7 composants visuels Fachwissen dans le registre (contrat
// §2, §4). Point d'entrée unique pour la page : `import { VisualBlock } from
// '@/components/visuals'`.

import { registerVisual } from './registry';
import { AnatomyMap } from './AnatomyMap';
import DecisionTree from './DecisionTree';
import { SyndromeMap } from './SyndromeMap';
import { Timeline } from './Timeline';
import CompareTable from './CompareTable';
import TherapyToggles from './TherapyToggles';
import { ScoreGauge } from './ScoreGauge';

registerVisual('anatomy-map', AnatomyMap);
registerVisual('decision-tree', DecisionTree);
registerVisual('syndrome-map', SyndromeMap);
registerVisual('timeline', Timeline);
registerVisual('compare-table', CompareTable);
registerVisual('therapy-toggles', TherapyToggles);
registerVisual('score-gauge', ScoreGauge);

export { VisualBlock } from './VisualBlock';
export type { VisualBlockProps } from './VisualBlock';
