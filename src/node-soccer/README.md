# Node.Soccer

Node.Soccer is the football simulation core for FC Power Showcase.

It is intentionally renderer-agnostic: the simulation can run independently of Three.js, React, or the browser UI.

## Core systems

- 11v11 player model
- Player ratings, stamina and cards
- Ball velocity, height and bounce physics
- Passing and shooting
- Tackles and fouls
- Yellow/red cards
- Offside detection hook
- Penalty decisions
- Match clock and halves
- Match event stream
- Basic positional AI

## Example

```ts
import { FootballMatch } from './index';

const match = new FootballMatch({
  teams: [homeTeam, awayTeam]
});

match.start();

function tick(dt: number) {
  match.update(dt);
}
```

The renderer can consume `match.players`, `match.ball`, `match.score`, and `match.events` to display the simulation in Three.js or another frontend.