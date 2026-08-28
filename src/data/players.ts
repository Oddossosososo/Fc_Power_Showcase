export type Player = {
  id: string;
  name: string;
  nation: string;
  position: string;
  ovr: number;
  act: string;
};

export const PLAYERS: Player[] = [
  { id:'ronaldo', name:'Cristiano Ronaldo', nation:'Portugal', position:'ST', ovr:99, act:'Rocket Free Kick' },
  { id:'messi', name:'Lionel Messi', nation:'Argentina', position:'RW', ovr:99, act:'Impossible Curl' },
  { id:'mbappe', name:'Kylian Mbappé', nation:'France', position:'ST', ovr:98, act:'Lightning Run' },
  { id:'haaland', name:'Erling Haaland', nation:'Norway', position:'ST', ovr:98, act:'Thunder Strike' },
  { id:'neymar', name:'Neymar', nation:'Brazil', position:'LW', ovr:97, act:'Skill Master' },
  { id:'debruyne', name:'Kevin De Bruyne', nation:'Belgium', position:'CM', ovr:96, act:'Laser Pass' },
];
