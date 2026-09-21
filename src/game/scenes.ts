import type { LocationId } from './locations';

export type DialogMode = 'standard' | 'phone' | 'choices';

export interface ChoiceOption {
  label: string;
  line: string;
  scoreBonus: number;
  restlessBonus: number;
}

export interface SceneConfig {
  mode: DialogMode;
  title: string;
  lines: string[];
  choices?: ChoiceOption[];
}

export const SCENES: Partial<Record<LocationId, SceneConfig>> = {
  home: {
    mode: 'standard',
    title: '🏠 Condo with Dan',
    lines: [
      'Home sweet condo. Louise and Dan’s place — cozy, organized-ish, and never quiet for long.',
      'She makes the bed with Olympic intensity. The pillows are aligned. Dan’s side exists.',
      'One drawer, reorganized. Three minutes later she’ll reorganize it again. It’s a lifestyle.',
      'Kitchen time: chicken. Steak. The sacred “only brown food” menu — because Dan won’t eat anything exotic.',
      'Dan (from the couch): “…thanks.” Louise: “You’re welcome. I’m already putting on shoes.”',
    ],
  },
  grit_cycle: {
    mode: 'standard',
    title: '🚴 Grit Cycle · Dana Point',
    lines: [
      'Grit Cycle in Dana Point. Daily pilgrimage. The bike knows her name.',
      'She tried making friends after class — a wave, a “great workout.” Friendly nods… then everyone grabbed their keys.',
      'Ignored? Maybe. Louise still clipped in, still showed up anyway. That’s not embarrassing — that’s stubborn sunshine.',
      'Tomorrow she’ll be back. Because she always is.',
    ],
  },
  ai_meetup: {
    mode: 'choices',
    title: '🤖 Finding her AI people',
    lines: [
      'Louise spotted a casual OC meetup. Deep breath. She wants friends who are into AI — real ones.',
      'Louise: “Hi! Anyone here into AI?” · Stranger: “I love my phone.” · Another: “Is that the same thing?”',
      'Okay. No judgment. Just… trying.',
    ],
    choices: [
      {
        label: 'Gently explain LLMs & why they’re cool',
        line:
          'She geeked out for thirty seconds. Polite smiles. Still looking for her AI people… but she was brave and kind.',
        scoreBonus: 15,
        restlessBonus: 8,
      },
      {
        label: 'Laugh it off & ask about their hobbies',
        line:
          'Someone stayed to chat about meal-planning with ChatGPT. Tiny spark. Still looking for her AI people — maybe closer.',
        scoreBonus: 25,
        restlessBonus: 12,
      },
    ],
  },
};

export const NINA_PHONE_SCENE: SceneConfig = {
  mode: 'phone',
  title: '📞 Nina',
  lines: [
    'Louise: Nina!! Guess where I am now—',
    'Nina: Let me guess. In motion.',
    'Louise: I reorganized a drawer AND found skincare on sale. Are you free later?',
    'Nina: Always. Love you. Go putter somewhere.',
  ],
};
