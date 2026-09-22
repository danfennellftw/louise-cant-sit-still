import type { Line, MiniChoice } from '../world/types';

export type CallerId = 'mom' | 'nina';

export interface CallScript {
  name: string;
  letter: string;
  color: string;
  /** Lines when she picks up and holds the phone to her ear (modal). */
  answer: (where: string) => Line[];
  choices: MiniChoice[];
  /** Lines when she puts it on speaker and keeps moving. */
  speaker: (where: string) => Line[];
  /** Texts that land after a declined / missed call. */
  missedTexts: string[];
}

/*
 * Louise's mom speaks Tagalog, with her signature English check-in:
 * "Are you there?" / "Just calling. Just calling." / "Nothing nothing."
 * Tagalog lines carry an English subtitle in `sub`.
 */
export const CALLS: Record<CallerId, CallScript> = {
  mom: {
    name: 'Mom',
    letter: 'M',
    color: '#e86a8f',
    answer: () => [
      { who: 'mom', text: 'Hello? Anak? Nandiyan ka ba?', sub: 'Hello? My child? Are you there?' },
      { who: 'mom', text: 'Are you there?' },
      { who: 'louise', text: 'Hi Ma! I’m here. What’s up?' },
      { who: 'mom', text: 'Wala lang. Just calling. Just calling.', sub: 'Nothing, really.' },
      { who: 'louise', text: '…Okay. Is everything okay?' },
      { who: 'mom', text: 'Oo, okay lang. Nothing nothing.', sub: 'Yes, all fine.' },
      { who: 'mom', text: 'Kumain ka na ba?', sub: 'Have you eaten?' },
      { who: 'louise', text: 'Yes Ma. Brown food only.' },
      { who: 'mom', text: 'Sige, ingat ka ha. Just calling.', sub: 'Okay, take care.' },
    ],
    choices: [
      {
        label: '“Love you, Ma.”',
        reply: [
          { who: 'mom', text: 'Love you too, anak. Nothing nothing. Bye.' },
          { who: 'mom', text: '…Are you there?' },
        ],
        hearts: 4,
      },
      {
        label: '“Ma, I’m literally mid-lap.”',
        reply: [{ who: 'mom', text: 'Ay, sige sige. Huwag masyadong pagod ha. Just calling!', sub: 'Oh, okay okay. Don’t get too tired, okay?' }],
        hearts: 3,
      },
    ],
    speaker: () => [
      { who: 'mom', text: 'Hello? Hello? Anak?', sub: 'My child?' },
      { who: 'mom', text: 'Are you there?' },
      { who: 'louise', text: 'You’re on speaker, Ma! I’m walking!' },
      { who: 'mom', text: 'Ay, naglalakad na naman. Just calling. Just calling.', sub: 'Oh, walking again.' },
      { who: 'mom', text: 'Nothing nothing. Sige, bye!', sub: 'Okay, bye!' },
      { who: 'mom', text: '…Are you there?' },
    ],
    missedTexts: ['Are you there?', 'Just calling', 'Just calling', 'Nothing nothing'],
  },
  nina: {
    name: 'Nina',
    letter: 'N',
    color: '#b48cff',
    answer: (where) => [
      { who: 'nina', text: 'Okay, be honest. Are you sitting down right now?' },
      { who: 'louise', text: `I’m at ${where}. So… no.` },
      { who: 'nina', text: 'Of course you are. Did you eat? Did you sit? Pick one.' },
      { who: 'louise', text: 'I ate. Standing up. At a counter. Quickly.' },
      { who: 'nina', text: 'Growth. Okay — AI meetup later. I’m bringing a friend who also can’t sit still.' },
    ],
    choices: [
      { label: '“Perfect. We’ll pace together.”', reply: [{ who: 'nina', text: 'A walking meetup. Iconic. See you there.' }], hearts: 3 },
      { label: '“Call you back, I’m mid-errand!”', reply: [{ who: 'nina', text: 'You never call back. Love you. Go putter.' }], hearts: 2 },
    ],
    speaker: (where) => [
      { who: 'nina', text: 'Why do I hear wind? Are you walking?' },
      { who: 'louise', text: `Speakerphone! ${where}. Talk fast.` },
      { who: 'nina', text: 'I always talk fast to you. AI meetup later, okay?' },
      { who: 'nina', text: 'Love you. Go putter.' },
    ],
    missedTexts: ['walk-and-talk later?', '(you won’t, it’s fine, love you)'],
  },
};
