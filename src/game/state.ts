export interface Stats {
  kibbleServed: number;
  poopsBagged: number;
  barksCalmed: number;
  carpetScrubs: number;
  peesBlocked: number;
  peesMopped: number;
  reps: number;
  gymsVisited: string[];
  pingsCleared: number;
  urgesResisted: number;
  urgesTaken: number;
  dealsFound: number;
  shoesMatched: number;
  leoCrimes: number;
  facialPct: number;
  knotsCrushed: number;
  cuddles: number;
  zoomies: number;
  brownPct: number;
  waves: number;
  spinScore: number;
  putterDone: string[];
  skincareSteps: number;
  videosWatched: number;
  treatsGiven: number;
  honks: number;
  danComplaints: number;
}

function freshStats(): Stats {
  return {
    kibbleServed: 0,
    poopsBagged: 0,
    barksCalmed: 0,
    carpetScrubs: 0,
    peesBlocked: 0,
    peesMopped: 0,
    reps: 0,
    gymsVisited: [],
    pingsCleared: 0,
    urgesResisted: 0,
    urgesTaken: 0,
    dealsFound: 0,
    shoesMatched: 0,
    leoCrimes: 0,
    facialPct: 0,
    knotsCrushed: 0,
    cuddles: 0,
    zoomies: 0,
    brownPct: 0,
    waves: 0,
    spinScore: 0,
    putterDone: [],
    skincareSteps: 0,
    videosWatched: 0,
    treatsGiven: 0,
    honks: 0,
    danComplaints: 0,
  };
}

export type DayPhase = 'morning' | 'noon' | 'afternoon' | 'evening' | 'night';

export class GameState {
  chill = 70;
  stats: Stats = freshStats();
  /** config for the travel interstitial */
  nextStop = { label: 'Grit Cycle, Dana Point', scene: 'title', phase: 'morning' as DayPhase };
  /** chapter scene id currently being played (for the day map) */
  currentChapter = '';
  /** chapter scene ids already completed today */
  chaptersDone: string[] = [];
  /** where the day map should return to when closed */
  resumeScene = 'title';

  reset(): void {
    this.chill = 70;
    this.stats = freshStats();
    this.currentChapter = '';
    this.chaptersDone = [];
  }
}
