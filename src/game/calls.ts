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
    answer: () => [
      { who: 'nina', text: 'Are you home? Tell me you’re sitting down for once.' },
      { who: 'louise', text: 'I’m home. Technically. I’ve made the bed and reorganized a cabinet.' },
      { who: 'nina', text: 'Of course you have. Okay, quick — I have to pick up Hudson and Olivia from school at three.' },
      { who: 'nina', text: 'Jimmy’s on a work trip all week, so it’s just me on pickup. Every. Single. Day.' },
      { who: 'louise', text: 'I could ride along! I will absolutely not sit still in the car.' },
      { who: 'nina', text: 'You’d reorganize my glovebox before we left the pickup line.' },
    ],
    choices: [
      { label: '“I’d reorganize your whole car. Lovingly.”', reply: [{ who: 'nina', text: 'Hudson would pay you. Olivia would supervise. Love you.' }], hearts: 3 },
      { label: '“Tell Jimmy to hurry home.”', reply: [{ who: 'nina', text: 'Telling him you said that. He’s back Friday. Go putter.' }], hearts: 3 },
    ],
    speaker: () => [
      { who: 'nina', text: 'Why do you sound like you’re doing laps around your kitchen?' },
      { who: 'louise', text: 'Because I am. You’re on speaker!' },
      { who: 'nina', text: 'Figures. I’ve got Hudson and Olivia’s school pickup at three — Jimmy’s on his work trip, so it’s all me.' },
      { who: 'nina', text: 'Call me when you finally sit down. So… never. Love you.' },
    ],
    missedTexts: ['Jimmy’s on a work trip so I’m on school pickup all week', 'Hudson + Olivia say hi. call me when you sit (never)'],
  },
};
