# Dungeon Quest — Pushdown Automaton (PDA) Simulation
**Course Assessment:** Theory of Computation (TOC) FA-2  
**Institution:** Pimpri Chinchwad College of Engineering (PCCOE)  
**Project Guide:** Prof. Harsha Talele  

### Team Members:
- **Shreyas Kulkarni** — 124B1B289
- **Shravani Bhosale** — 124B1B293
- **Yuvraj Sherkar** — 124B1B295
- **Atharva Joshi** — 124B1B296

---

## 1. Overview & Reference Design Fidelity
This web application is a playable 2D top-down dungeon adventure synchronized with a formal theoretical Pushdown Automaton (PDA). The interface matches the reference design with:
- **Clean Pale Blue-Grey Aesthetic (`#EBF1F6`)**
- **Left Panel (52%):** Playable 2D top-down dungeon game with tile-based stone walls, corridors, wall sconce torches, collectibles (Golden Key, Gold Coins, Treasure Chest), and 4 color-coded action buttons (`Enter Room (A)`, `Exit Room (B)`, `Finish (F)`, `Reset (R)`).
- **Right Panel (48%):** Live theoretical PDA display showing Current State ($q_0, q_1, q_f$), Current Input ($a, b, f$), Latest Operation (`PUSH D`, `PUSH A`, `POP A`, `POP D`, `ACCEPT`), Vertical Stack Tower (top at the top visually, top-on-left string), Applied Mathematical Transition ($\delta(q, \sigma, X) = (p, \alpha)$), Input Sequence bubbles, and Transition History Table.

---

## 2. Controls & How to Play Locally
Simply double-click or open `index.html` in any web browser (Google Chrome, Microsoft Edge, Mozilla Firefox, Safari). **No server, Node.js, database, or network connection is required.**

### Keyboard & Movement Controls:
- **Walk Free Grid:** <kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> or <kbd>▲</kbd><kbd>◀</kbd><kbd>▼</kbd><kbd>▶</kbd> (Arrow Keys).
- **On-Screen D-Pad:** Click the directional buttons in the bottom-right corner of the canvas.
- **Click to Move:** Click any accessible floor tile to walk toward it.
- **Action Shortcuts:**
  - <kbd>A</kbd> — Enter Room (Forward Push)
  - <kbd>B</kbd> — Exit Room (Backtrack Pop)
  - <kbd>F</kbd> — Finish Game (Acceptance Check)
  - <kbd>R</kbd> — Reset Game & Automaton

---

## 3. Formal PDA Model (7-Tuple)
$$M = (Q, \Sigma, \Gamma, \delta, q_0, Z_0, F)$$

- **States:** $Q = \{q_0, q_1, q_f\}$
  - $q_0$: Outside dungeon (Initial state)
  - $q_1$: Exploring dungeon chambers (Active nesting state)
  - $q_f$: Quest completed (Final accepting state)
- **Input Alphabet:** $\Sigma = \{a, b, f\}$
  - $a$: Enter room (Push operation)
  - $b$: Exit room (Pop operation)
  - $f$: Finish quest (Final acceptance)
- **Stack Alphabet:** $\Gamma = \{Z_0, D, A\}$
  - $Z_0$: Initial base stack marker
  - $D$: Outer dungeon chamber marker
  - $A$: Nested inner chamber marker
- **Initial State:** $q_0$
- **Initial Stack:** $Z_0$
- **Final State:** $F = \{q_f\}$

### 6 Deterministic Transitions:
1. $\delta(q_0, a, Z_0) = (q_1, DZ_0)$ — Enter outer dungeon, push $D$ above $Z_0$.
2. $\delta(q_1, a, D) = (q_1, AD)$ — Enter 1st nested chamber, push $A$ above $D$.
3. $\delta(q_1, a, A) = (q_1, AA)$ — Enter deeper nested chamber, push $A$ above $A$.
4. $\delta(q_1, b, A) = (q_1, \varepsilon)$ — Exit nested chamber, pop top $A$.
5. $\delta(q_1, b, D) = (q_0, \varepsilon)$ — Exit outer dungeon, pop $D$, return to $q_0$.
6. $\delta(q_0, f, Z_0) = (q_f, Z_0)$ — Finish quest outside with empty dungeon stack ($Z_0$). Accepted!

---

## 4. Verification Test Cases for Viva Demonstration

| Test Sequence | Step-by-Step Path | Stack Evolution | Expected Result |
| :--- | :--- | :--- | :--- |
| `aabbf` | Enter Outer $\to$ Enter Room A $\to$ Exit Room A $\to$ Exit Outer $\to$ Finish | $Z_0 \to DZ_0 \to ADZ_0 \to DZ_0 \to Z_0 \to Z_0$ | **ACCEPTED** ($q_f$) |
| `aaabbbf` | Enter Outer $\to$ Room A $\to$ Room B $\to$ Exit B $\to$ Exit A $\to$ Exit Outer $\to$ Finish | $Z_0 \to DZ_0 \to ADZ_0 \to AADZ_0 \to ADZ_0 \to DZ_0 \to Z_0 \to Z_0$ | **ACCEPTED** ($q_f$) |
| `aabbbf` | 2 Enters, 2 Exits (reaches $q_0$, $Z_0$), then 3rd Exit attempted | Undefined $\delta(q_0, b, Z_0)$ | **REJECTED** on 3rd exit (Already outside) |
| `af` | Enter Outer dungeon, then attempt Finish | Undefined $\delta(q_1, f, DZ_0)$ | **REJECTED** (Cannot finish while inside rooms) |
| `b` | At initial state ($q_0, Z_0$), attempt Exit | Undefined $\delta(q_0, b, Z_0)$ | **REJECTED** immediately |

---

## 5. File Structure
- `index.html` — Semantic, responsive layout matching the reference mockup.
- `style.css` — Pixel-accurate styling, custom color palette, button styling, card shadows, and fonts.
- `game.js` — Interactive 2D canvas renderer, collision handling, collectibles, audio synthesis, and event synchronization.
- `pda.js` — Pure mathematical deterministic PDA engine implementing the formal 7-tuple.
- `pccoe_logo.png` — Authentic institutional branding.
