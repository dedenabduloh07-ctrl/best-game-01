// The five forges. Each layout is a grid of 12 columns; a row is a string:
// '.' empty, '1'/'2'/'3' a crystal that takes that many hits, 'X' a volatile
// crystal that bursts its neighbours, 'S' unbreakable starsteel, 'G' a golden
// crystal worth bonus points that always drops a shard.
export const LEVELS = [
  {
    name: 'FIRST LIGHT',
    tint: '#38e1ff',
    rows: [
      '............',
      '.1111111111.',
      '.1111111111.',
      '..11111111..',
      '..1.1111.1..',
      '............',
    ],
  },
  {
    name: 'EMBER REACH',
    tint: '#ff9d45',
    rows: [
      '.2222222222.',
      '2.11111111.2',
      '21X111111X12',
      '21X111111X12',
      '2.11111111.2',
      '.2222222222.',
    ],
  },
  {
    name: 'HOLLOW CHOIR',
    tint: '#b78bff',
    rows: [
      '.....22.....',
      '...221122...',
      '..221G122..',
      '.2211XX1122.',
      '..221G122..',
      '...221122...',
    ],
  },
  {
    name: 'STARSTEEL VAULT',
    tint: '#7dffb0',
    rows: [
      'S2222222222S',
      'S2X222222X2S',
      'S2211111122S',
      'S2211GG1122S',
      'S2X222222X2S',
      'S2222222222S',
    ],
  },
  {
    name: 'THE HEART',
    tint: '#ff5d7a',
    rows: [
      '.3333333333.',
      '33.222222.33',
      '332.1111.233',
      '332.1XX1.233',
      '33.222222.33',
      '.3333333333.',
    ],
  },
];

// Points for breaking a crystal of each kind, before the combo multiplier.
export const POINTS = { 1: 50, 2: 120, 3: 220, X: 90, G: 300, S: 0 };

// Crystal colours, per hit-points left (index 1..3) and special kinds.
export const COLORS = {
  1: ['#37e2ff', '#1b9fd8'],
  2: ['#ffb84d', '#e07b1f'],
  3: ['#ff6b8f', '#c22a54'],
  X: ['#f5ff6b', '#d8a41b'],
  G: ['#ffe98a', '#d4a017'],
  S: ['#9aa7b8', '#5d6b80'],
};
