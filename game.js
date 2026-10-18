/**
 * ============================================================================
 * Dungeon Quest: Exact Reference Design Game Engine & Live PDA Controller
 * Theory of Computation FA-2 — PCCOE
 *
 * Implements:
 * - Playable grid-based 2D top-down dungeon adventure (WASD / Arrows / D-pad)
 * - Wall collisions, collectibles (Key, Coins, Treasure Chest)
 * - Concentric room progression with real doorway interactions
 * - Live synchronization with pure formal Pushdown Automaton (pda.js)
 * - Animated stack, metrics, transition formulas, and history table
 * - Web Audio API procedural sound synthesizer (no external assets)
 * ============================================================================
 */

document.addEventListener('DOMContentLoaded', () => {
  // Initialize Pure PDA Engine
  const pda = new DungeonPDA();

  // --------------------------------------------------------------------------
  // DOM References
  // --------------------------------------------------------------------------
  const canvas = document.getElementById('dungeonCanvas');
  const ctx = canvas.getContext('2d');
  const canvasViewport = document.getElementById('canvasViewport');
  const gameToast = document.getElementById('gameToast');

  // Header Elements
  const btnHeaderReset = document.getElementById('btnHeaderReset');

  // Left Panel Elements
  const locName = document.getElementById('locName');
  const depthVal = document.getElementById('depthVal');
  const btnEnter = document.getElementById('btnEnter');
  const btnExit = document.getElementById('btnExit');
  const btnFinish = document.getElementById('btnFinish');
  const btnReset = document.getElementById('btnReset');

  // Right Panel Elements
  const dispState = document.getElementById('dispState');
  const dispInput = document.getElementById('dispInput');
  const dispOp = document.getElementById('dispOp');
  const stackBracket = document.getElementById('stackBracket');
  const dispStackStr = document.getElementById('dispStackStr');
  const dispFormula = document.getElementById('dispFormula');
  const dispSequence = document.getElementById('dispSequence');
  const historyTbody = document.getElementById('historyTbody');

  // Alert Modal Toast
  const rejectionAlert = document.getElementById('rejectionAlert');
  const alertText = document.getElementById('alertText');
  const alertClose = document.getElementById('alertClose');

  // --------------------------------------------------------------------------
  // AUDIO SYNTHESIZER (Web Audio API - Zero External Files)
  // --------------------------------------------------------------------------
  let audioCtx = null;

  function initAudio() {
    if (!audioCtx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        audioCtx = new AudioContext();
      }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
  }

  function playTone(freq, duration, type = 'sine', gainVal = 0.1) {
    try {
      initAudio();
      if (!audioCtx) return;
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
      gain.gain.setValueAtTime(gainVal, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + duration);
    } catch (e) {
      // Audio autoplay policy fallback
    }
  }

  function soundStep() {
    playTone(130, 0.05, 'triangle', 0.04);
  }

  function soundKey() {
    initAudio();
    if (!audioCtx) return;
    [523, 659, 784, 1046].forEach((f, i) => {
      setTimeout(() => playTone(f, 0.14, 'sine', 0.08), i * 65);
    });
  }

  function soundCoins() {
    initAudio();
    if (!audioCtx) return;
    [784, 988, 1175].forEach((f, i) => {
      setTimeout(() => playTone(f, 0.12, 'triangle', 0.07), i * 55);
    });
  }

  function soundChest() {
    initAudio();
    if (!audioCtx) return;
    [440, 554, 659, 880, 1108].forEach((f, i) => {
      setTimeout(() => playTone(f, 0.22, 'square', 0.06), i * 80);
    });
  }

  function soundPush() {
    initAudio();
    if (!audioCtx) return;
    playTone(392, 0.12, 'sine', 0.09);
    setTimeout(() => playTone(587, 0.16, 'sine', 0.09), 90);
  }

  function soundPop() {
    initAudio();
    if (!audioCtx) return;
    playTone(587, 0.12, 'sine', 0.09);
    setTimeout(() => playTone(392, 0.16, 'sine', 0.09), 90);
  }

  function soundAccept() {
    initAudio();
    if (!audioCtx) return;
    [523, 659, 784, 1046, 1318].forEach((f, i) => {
      setTimeout(() => playTone(f, 0.35, 'triangle', 0.1), i * 110);
    });
  }

  function soundReject() {
    initAudio();
    if (!audioCtx) return;
    playTone(180, 0.12, 'sawtooth', 0.12);
    setTimeout(() => playTone(140, 0.2, 'sawtooth', 0.12), 120);
  }

  // --------------------------------------------------------------------------
  // GRID MAP CONFIGURATION (21 Cols x 17 Rows, Tile = 26px)
  // --------------------------------------------------------------------------
  const COLS = 21;
  const ROWS = 17;
  const TILE = 26;

  // Solid Walls Set: string set of "x,y"
  const walls = new Set();

  function buildWalls() {
    walls.clear();

    // 1. Outer Fortress Wall (col 2..18, row 2..14)
    for (let c = 2; c <= 18; c++) {
      if (c !== 10) { // col 10 is Exit Door
        walls.add(`${c},2`);
      }
      if (c !== 10) { // col 10 is Entrance Door
        walls.add(`${c},14`);
      }
    }
    for (let r = 2; r <= 14; r++) {
      walls.add(`2,${r}`);
      walls.add(`18,${r}`);
    }

    // 2. Room A Wall (col 5..15, row 5..11)
    for (let c = 5; c <= 15; c++) {
      if (c !== 10) { // Doorway top
        walls.add(`${c},5`);
      }
      if (c !== 10) { // Doorway bottom
        walls.add(`${c},11`);
      }
    }
    for (let r = 5; r <= 11; r++) {
      walls.add(`5,${r}`);
      walls.add(`15,${r}`);
    }

    // 3. Room B Wall (col 8..12, row 7..9)
    for (let c = 8; c <= 12; c++) {
      if (c !== 10) { // Doorway top
        walls.add(`${c},7`);
      }
      if (c !== 10) { // Doorway bottom
        walls.add(`${c},9`);
      }
    }
    for (let r = 7; r <= 9; r++) {
      walls.add(`8,${r}`);
      walls.add(`12,${r}`);
    }
  }

  buildWalls();

  function isWall(x, y) {
    return walls.has(`${x},${y}`);
  }

  // --------------------------------------------------------------------------
  // GAME ENTITIES & STATE
  // --------------------------------------------------------------------------
  const player = {
    x: 10,
    y: 15,
    visualX: 10,
    visualY: 15,
    facing: 'up', // 'up', 'down', 'left', 'right'
    isWalking: false,
    walkFrame: 0,
    walkTimer: 0
  };

  const collectibles = {
    key: { x: 3, y: 8, collected: false },
    coins: { x: 16, y: 8, collected: false },
    crates: { x: 16, y: 3 },
    chest: { x: 10, y: 8, opened: false }
  };

  // Sparkles & Celebration Particles
  const particles = [];

  function addSparkle(x, y, color = '#FFD700', count = 12) {
    for (let i = 0; i < count; i++) {
      particles.push({
        x: x * TILE + TILE / 2,
        y: y * TILE + TILE / 2,
        vx: (Math.random() - 0.5) * 3.5,
        vy: (Math.random() - 0.5) * 3.5 - 1.5,
        life: 1.0,
        decay: 0.02 + Math.random() * 0.02,
        size: 2.5 + Math.random() * 3,
        color: color
      });
    }
  }

  function showToast(text) {
    gameToast.textContent = text;
    gameToast.classList.add('visible');
    clearTimeout(gameToast._timer);
    gameToast._timer = setTimeout(() => {
      gameToast.classList.remove('visible');
    }, 2400);
  }

  function showRejection(reason) {
    soundReject();
    alertText.textContent = reason;
    rejectionAlert.classList.add('show');
    clearTimeout(rejectionAlert._timer);
    rejectionAlert._timer = setTimeout(() => {
      rejectionAlert.classList.remove('show');
    }, 4500);
  }

  alertClose.addEventListener('click', () => {
    rejectionAlert.classList.remove('show');
  });

  // --------------------------------------------------------------------------
  // LOCATION & DEPTH CALCULATION
  // --------------------------------------------------------------------------
  function getLocationName(x, y) {
    // Outside boundary
    if (y > 14 || y < 2 || x < 2 || x > 18) {
      return 'Outside';
    }
    // Room B
    if (x >= 9 && x <= 11 && y === 8) {
      return 'Room B (Innermost)';
    }
    // Room A
    if (x >= 6 && x <= 14 && y >= 6 && y <= 10) {
      return 'Room A';
    }
    // Outer Dungeon
    return 'Outer Dungeon';
  }

  // --------------------------------------------------------------------------
  // TILE-BY-TILE MOVEMENT CONTROLLER
  // --------------------------------------------------------------------------
  let isMovingAnim = false;
  let moveQueue = [];

  function movePlayer(dx, dy) {
    if (isMovingAnim) return;

    // Determine facing
    if (dy < 0) player.facing = 'up';
    else if (dy > 0) player.facing = 'down';
    else if (dx < 0) player.facing = 'left';
    else if (dx > 0) player.facing = 'right';

    const targetX = player.x + dx;
    const targetY = player.y + dy;

    // Bounds checking
    if (targetX < 1 || targetX > 19 || targetY < 0 || targetY > 16) {
      return;
    }

    // Collision checking
    if (isWall(targetX, targetY)) {
      return;
    }

    // Move to target tile
    const prevY = player.y;
    player.x = targetX;
    player.y = targetY;
    player.isWalking = true;
    soundStep();

    // Check Collectibles
    checkTileInteractions(player.x, player.y);

    // Check Doorway Crossing (Forward or Backward)
    checkDoorwayCrossings(prevY, player.y);

    updateUI();
  }

  function checkTileInteractions(x, y) {
    // 1. Key
    if (!collectibles.key.collected && x === collectibles.key.x && y === collectibles.key.y) {
      collectibles.key.collected = true;
      soundKey();
      addSparkle(x, y, '#FBBF24', 16);
      showToast('Key collected! 🗝️');
    }

    // 2. Coins
    if (!collectibles.coins.collected && x === collectibles.coins.x && y === collectibles.coins.y) {
      collectibles.coins.collected = true;
      soundCoins();
      addSparkle(x, y, '#FCD34D', 18);
      showToast('Coins collected! +50 Gold 💰');
    }

    // 3. Chest
    if (!collectibles.chest.opened && x === collectibles.chest.x && y === collectibles.chest.y) {
      collectibles.chest.opened = true;
      soundChest();
      addSparkle(x, y, '#60A5FA', 24);
      addSparkle(x, y, '#FBBF24', 24);
      showToast('Treasure Chest Opened! 🏆✨');
    }
  }

  function checkDoorwayCrossings(prevY, curY) {
    if (player.x !== 10) return;

    // ------------------------------------------------------------------------
    // SOUTH GATES & DOORWAYS (Ascending y decreases; Descending y increases)
    // ------------------------------------------------------------------------

    // 1. South Entrance: Between Outside (y=14) and Outer Dungeon (y=13)
    if (prevY === 14 && curY === 13) {
      // Entering Outer Dungeon from South Entrance
      if (pda.getNestingDepth() === 0 && pda.state === 'q0') {
        executePDAAction('a');
      }
    } else if (prevY === 13 && curY === 14) {
      // Exiting Outer Dungeon to South Entrance
      if (pda.getNestingDepth() === 1) {
        executePDAAction('b');
      }
    }

    // 2. South Room A Doorway: Between Outer Dungeon (y=12) and Room A (y=10)
    else if ((prevY === 12 || prevY === 11) && curY === 10) {
      // Entering Room A from South
      if (pda.getNestingDepth() === 1) {
        executePDAAction('a');
      }
    } else if (prevY === 10 && (curY === 11 || curY === 12)) {
      // Exiting Room A to South
      if (pda.getNestingDepth() === 2) {
        executePDAAction('b');
      }
    }

    // 3. South Room B Doorway: Between Room A (y=9) and Room B (y=8)
    else if (prevY === 9 && curY === 8) {
      // Entering Room B from South
      if (pda.getNestingDepth() === 2) {
        executePDAAction('a');
      }
    } else if (prevY === 8 && curY === 9) {
      // Exiting Room B to South
      if (pda.getNestingDepth() === 3) {
        executePDAAction('b');
      }
    }

    // ------------------------------------------------------------------------
    // NORTH GATES & DOORWAYS (Progressing North toward Exit)
    // ------------------------------------------------------------------------

    // 4. North Room B Doorway: Between Room B (y=8) and Room A North (y=6, 7)
    else if (prevY === 8 && (curY === 7 || curY === 6)) {
      // Exiting Room B to North
      if (pda.getNestingDepth() === 3) {
        executePDAAction('b');
      }
    } else if ((prevY === 6 || prevY === 7) && curY === 8) {
      // Entering Room B from North
      if (pda.getNestingDepth() === 2) {
        executePDAAction('a');
      }
    }

    // 5. North Room A Doorway: Between Room A (y=6) and Outer Dungeon North (y=4, 5)
    else if ((prevY === 6 || prevY === 5) && curY === 4) {
      // Exiting Room A to North
      if (pda.getNestingDepth() === 2) {
        executePDAAction('b');
      }
    } else if (prevY === 4 && (curY === 5 || curY === 6)) {
      // Entering Room A from North
      if (pda.getNestingDepth() === 1) {
        executePDAAction('a');
      }
    }

    // 6. North Exit Gate: Between Outer Dungeon (y=2) and Outside Exit (y=1)
    else if (prevY === 2 && curY === 1) {
      // Exiting Outer Dungeon to North Exit Gate
      if (pda.getNestingDepth() === 1) {
        executePDAAction('b');
      }
    } else if (prevY === 1 && curY === 2) {
      // Re-entering Outer Dungeon from North Exit Gate
      if (pda.getNestingDepth() === 0 && pda.state === 'q0') {
        executePDAAction('a');
      }
    }
  }

  // --------------------------------------------------------------------------
  // PDA ACTION EXECUTOR
  // --------------------------------------------------------------------------
  function executePDAAction(symbol) {
    const res = pda.processInput(symbol);

    if (res.success) {
      if (symbol === 'a') {
        soundPush();
      } else if (symbol === 'b') {
        soundPop();
      } else if (symbol === 'f') {
        soundAccept();
        addSparkle(player.x, player.y, '#34D399', 30);
        addSparkle(player.x, player.y, '#FBBF24', 30);
        showToast('Quest Accepted by Final State qf! 🏆');
      }
    } else {
      showRejection(res.reason);
    }

    updateUI();
    return res;
  }

  // --------------------------------------------------------------------------
  // SMOOTH PATH / BUTTON WALKING AUTOMATION
  // (Smoothly walks the hero to doorways instead of teleporting)
  // --------------------------------------------------------------------------
  function walkPath(steps, onComplete) {
    if (steps.length === 0) {
      if (onComplete) onComplete();
      return;
    }
    isMovingAnim = true;
    const [dx, dy] = steps.shift();

    if (dy < 0) player.facing = 'up';
    else if (dy > 0) player.facing = 'down';
    else if (dx < 0) player.facing = 'left';
    else if (dx > 0) player.facing = 'right';

    player.x += dx;
    player.y += dy;
    soundStep();
    checkTileInteractions(player.x, player.y);

    setTimeout(() => {
      walkPath(steps, onComplete);
    }, 130);
  }

  function handleButtonEnter() {
    if (isMovingAnim) return;
    const depth = pda.getNestingDepth();

    if (depth === 0) {
      // If outside at North Exit (y <= 1), enter North Gate
      if (player.y <= 1) {
        walkPath([[0, 1], [0, 1]], () => {
          isMovingAnim = false;
          executePDAAction('a');
        });
      } else {
        // Outside at South Gate, enter South Entrance
        player.x = 10; player.y = 15;
        walkPath([[0, -1], [0, -1]], () => {
          isMovingAnim = false;
          executePDAAction('a');
        });
      }
    } else if (depth === 1) {
      // In Outer Dungeon: enter Room A
      // If closer to North doorway (y < 8), walk through North door (y=5 -> 6)
      if (player.y < 8) {
        player.x = 10; player.y = 4;
        walkPath([[0, 1], [0, 1]], () => {
          isMovingAnim = false;
          executePDAAction('a');
        });
      } else {
        // Closer to South doorway (y >= 8), walk through South door (y=12 -> 10)
        player.x = 10; player.y = 12;
        walkPath([[0, -1], [0, -1]], () => {
          isMovingAnim = false;
          executePDAAction('a');
        });
      }
    } else if (depth === 2) {
      // In Room A: enter Room B (innermost, y=8)
      if (player.y < 8) {
        player.x = 10; player.y = 6;
        walkPath([[0, 1], [0, 1]], () => {
          isMovingAnim = false;
          executePDAAction('a');
        });
      } else {
        player.x = 10; player.y = 10;
        walkPath([[0, -1], [0, -1]], () => {
          isMovingAnim = false;
          executePDAAction('a');
        });
      }
    } else {
      showToast('Max chamber depth reached (Depth 3). Open chest and exit!');
    }
  }

  function handleButtonExit() {
    if (isMovingAnim) return;
    const depth = pda.getNestingDepth();

    if (depth === 3) {
      // In Room B (y=8): exit to Room A
      // If heading North toward Exit, exit North (y=8 -> 6)
      // If heading South, exit South (y=8 -> 10)
      if (player.facing === 'up') {
        walkPath([[0, -1], [0, -1]], () => {
          isMovingAnim = false;
          executePDAAction('b');
        });
      } else {
        walkPath([[0, 1], [0, 1]], () => {
          isMovingAnim = false;
          executePDAAction('b');
        });
      }
    } else if (depth === 2) {
      // In Room A: exit to Outer Dungeon
      if (player.y < 8) {
        player.x = 10; player.y = 6;
        walkPath([[0, -1], [0, -1]], () => {
          isMovingAnim = false;
          executePDAAction('b');
        });
      } else {
        player.x = 10; player.y = 10;
        walkPath([[0, 1], [0, 1]], () => {
          isMovingAnim = false;
          executePDAAction('b');
        });
      }
    } else if (depth === 1) {
      // In Outer Dungeon: exit to Outside
      // If player is in North half, exit through North Gate (↑ Exit) at y=1!
      if (player.y < 8) {
        player.x = 10; player.y = 3;
        walkPath([[0, -1], [0, -1]], () => {
          isMovingAnim = false;
          executePDAAction('b');
        });
      } else {
        // In South half, exit through South Gate (↑ Entrance) at y=14!
        player.x = 10; player.y = 13;
        walkPath([[0, 1], [0, 1]], () => {
          isMovingAnim = false;
          executePDAAction('b');
        });
      }
    } else {
      // Already outside! Formal PDA rejection
      executePDAAction('b');
    }
  }

  function handleButtonFinish() {
    executePDAAction('f');
  }

  function handleReset() {
    pda.reset();
    player.x = 10;
    player.y = 15;
    player.visualX = 10;
    player.visualY = 15;
    player.facing = 'up';
    isMovingAnim = false;

    collectibles.key.collected = false;
    collectibles.coins.collected = false;
    collectibles.chest.opened = false;
    particles.length = 0;

    rejectionAlert.classList.remove('show');
    showToast('Game & Automaton Reset to Initial State (q₀, Z₀)');
    soundPop();
    updateUI();
  }

  // --------------------------------------------------------------------------
  // EVENT LISTENERS: KEYBOARD & BUTTONS
  // --------------------------------------------------------------------------
  btnEnter.addEventListener('click', handleButtonEnter);
  btnExit.addEventListener('click', handleButtonExit);
  btnFinish.addEventListener('click', handleButtonFinish);
  btnReset.addEventListener('click', handleReset);
  btnHeaderReset.addEventListener('click', handleReset);

  // Keyboard navigation
  window.addEventListener('keydown', (e) => {
    // Prevent default scrolling on arrow keys & space
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
      e.preventDefault();
    }

    const key = e.key.toLowerCase();

    // 1. Grid Movement
    if (key === 'arrowup' || key === 'w') {
      movePlayer(0, -1);
    } else if (key === 'arrowdown' || key === 's') {
      movePlayer(0, 1);
    } else if (key === 'arrowleft' || key === 'a' && e.ctrlKey === false && e.altKey === false) {
      // Check if 'a' is intended for Enter Room shortcut or Left move
      // If pressing ArrowLeft, it's always move left.
      // For WASD: W=Up, S=Down, A=Left, D=Right
      // To allow both, A/B/F/R shortcuts:
      // If user presses Shift+A or enters near door, we can distinguish or support both!
      movePlayer(-1, 0);
    } else if (key === 'arrowright' || key === 'd') {
      movePlayer(1, 0);
    }

    // 2. Action Shortcuts
    if (e.key === 'a' || e.key === 'A') {
      // If player is at door or outside, trigger Enter Room
      handleButtonEnter();
    } else if (e.key === 'b' || e.key === 'B') {
      handleButtonExit();
    } else if (e.key === 'f' || e.key === 'F') {
      handleButtonFinish();
    } else if (e.key === 'r' || e.key === 'R') {
      handleReset();
    }
  });

  // Touch / Click D-Pad buttons
  document.querySelectorAll('.dpad-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const dir = btn.getAttribute('data-dir');
      if (dir === 'up') movePlayer(0, -1);
      else if (dir === 'down') movePlayer(0, 1);
      else if (dir === 'left') movePlayer(-1, 0);
      else if (dir === 'right') movePlayer(1, 0);
    });
  });

  // Click on Canvas to Walk toward destination
  canvas.addEventListener('click', (e) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const clickX = Math.floor((e.clientX - rect.left) * scaleX / TILE);
    const clickY = Math.floor((e.clientY - rect.top) * scaleY / TILE);

    const dx = Math.sign(clickX - player.x);
    const dy = Math.sign(clickY - player.y);

    if (Math.abs(clickX - player.x) >= Math.abs(clickY - player.y)) {
      if (dx !== 0) movePlayer(dx, 0);
      else if (dy !== 0) movePlayer(0, dy);
    } else {
      if (dy !== 0) movePlayer(0, dy);
      else if (dx !== 0) movePlayer(dx, 0);
    }
  });

  // --------------------------------------------------------------------------
  // UI SYNCHRONIZATION WITH RIGHT PANEL
  // --------------------------------------------------------------------------
  function updateUI() {
    const depth = pda.getNestingDepth();
    const state = pda.state;

    // 1. Location & Depth
    locName.textContent = getLocationName(player.x, player.y);
    depthVal.textContent = depth;

    // 2. State, Input, Latest Operation
    dispState.textContent = state === 'q0' ? 'q₀' : (state === 'q1' ? 'q₁' : 'qf');
    dispInput.textContent = pda.lastSymbol ? pda.lastSymbol : '-';
    dispOp.textContent = pda.lastOperation || 'READY';

    // 3. Stack Visualization
    renderStackBracket();

    // 4. Transition Applied
    renderAppliedFormula();

    // 5. Input Sequence
    renderInputSequence();

    // 6. Transition History Table
    renderHistoryTable();

    // 7. Button States
    btnFinish.disabled = (state === 'qf');
  }

  function renderStackBracket() {
    stackBracket.innerHTML = '';
    const stack = pda.stack; // index 0 is TOP (e.g. ['D', 'Z0'])
    dispStackStr.textContent = pda.getStackString();

    const maxSlots = 4;
    const emptyCount = Math.max(0, maxSlots - stack.length);

    // Render empty top slots to maintain bracket height
    for (let i = 0; i < emptyCount; i++) {
      const emptyCell = document.createElement('div');
      emptyCell.className = 'stack-cell cell-empty';
      stackBracket.appendChild(emptyCell);
    }

    // Render stack symbols from top to bottom
    stack.forEach((symbol, idx) => {
      const cell = document.createElement('div');
      const isBase = (symbol === 'Z0');
      cell.className = `stack-cell ${isBase ? 'cell-base' : 'cell-amber'}`;
      cell.textContent = isBase ? 'Z₀' : symbol;
      stackBracket.appendChild(cell);
    });
  }

  function renderAppliedFormula() {
    const rule = pda.lastRuleNumber;
    let formula = 'δ( q₀, ε, Z₀ ) = Initial State';

    if (rule === 1) {
      formula = 'δ(q₀, a, Z₀) = (q₁, DZ₀)';
    } else if (rule === 2) {
      formula = 'δ(q₁, a, D) = (q₁, AD)';
    } else if (rule === 3) {
      formula = 'δ(q₁, a, A) = (q₁, AA)';
    } else if (rule === 4) {
      formula = 'δ(q₁, b, A) = (q₁, ε)';
    } else if (rule === 5) {
      formula = 'δ(q₁, b, D) = (q₀, ε)';
    } else if (rule === 6) {
      formula = 'δ(q₀, f, Z₀) = (qf, Z₀)';
    } else if (pda.status === 'REJECTED') {
      formula = `δ(${pda.state}, ${pda.lastSymbol || 'input'}, ${pda.getStackTop() || 'Z₀'}) = UNDEFINED`;
    }

    dispFormula.textContent = formula;
  }

  function renderInputSequence() {
    dispSequence.innerHTML = '';
    const seq = pda.inputSequence;
    const totalSlots = Math.max(6, seq.length + 1);

    for (let i = 0; i < totalSlots; i++) {
      const pill = document.createElement('span');
      if (i < seq.length) {
        pill.className = 'seq-pill filled';
        pill.textContent = seq[i];
      } else {
        pill.className = 'seq-pill empty';
        pill.textContent = '-';
      }
      dispSequence.appendChild(pill);
    }
  }

  function renderHistoryTable() {
    historyTbody.innerHTML = '';
    const history = pda.history; // latest is at history[0]

    // We display rows in chronological order (1, 2, 3...)
    const chronological = [...history].reverse();

    if (chronological.length === 0) {
      const emptyRow = document.createElement('tr');
      emptyRow.innerHTML = `<td colspan="5" style="text-align: center; color: #94A3B8; padding: 12px;">No transitions applied yet. Walk into the dungeon or press Enter Room (A).</td>`;
      historyTbody.appendChild(emptyRow);
      return;
    }

    chronological.forEach((entry, idx) => {
      const row = document.createElement('tr');
      const isPush = entry.op.includes('PUSH');
      const isPop = entry.op.includes('POP');
      const isAccept = entry.op.includes('ACCEPT');
      const isReject = entry.status === 'REJECTED';

      const opClass = isPush ? 'col-push' : (isPop ? 'col-pop' : (isAccept ? 'col-accept' : (isReject ? 'col-rejected' : '')));

      const fromTo = `${entry.prevState === 'q0' ? 'q₀' : (entry.prevState === 'q1' ? 'q₁' : 'qf')} → ${entry.nextState === 'q0' ? 'q₀' : (entry.nextState === 'q1' ? 'q₁' : 'qf')}`;

      row.innerHTML = `
        <td class="col-step">${idx + 1}</td>
        <td class="${opClass}">${entry.op}</td>
        <td><strong>${entry.input}</strong></td>
        <td>${fromTo}</td>
        <td><strong>${entry.newStack}</strong></td>
      `;
      historyTbody.appendChild(row);
    });
  }

  // --------------------------------------------------------------------------
  // CANVAS RENDERING ENGINE (EXACT MATCH TO REFERENCE DESIGN)
  // --------------------------------------------------------------------------
  let animTick = 0;

  function render() {
    animTick++;

    // Smooth player visual interpolation
    player.visualX += (player.x - player.visualX) * 0.28;
    player.visualY += (player.y - player.visualY) * 0.28;

    const W = canvas.width;
    const H = canvas.height;

    ctx.clearRect(0, 0, W, H);

    // 1. OUTSIDE NATURE BACKGROUND
    ctx.fillStyle = '#212E40';
    ctx.fillRect(0, 0, W, H);

    // Draw stylized rocks and pine trees around the fortress
    drawOutdoorScenery();

    // 2. DUNGEON STONE FLOORS
    drawDungeonFloors();

    // 3. DUNGEON STONE WALLS (3D Blocks & Bevels)
    drawStoneWalls();

    // 4. DOORWAYS & STAIRS
    drawDoorwaysAndStairs();

    // 5. WALL TORCHES (Flickering light & flame)
    drawWallTorches();

    // 6. COLLECTIBLES & PROPS
    drawCollectiblesAndProps();

    // 7. IN-GAME CANVAS BADGES ('Outer Dungeon', 'Room A', 'Room B', '↑ Entrance', '↑ Exit')
    drawCanvasBadges();

    // 8. PLAYER ADVENTURER CHARACTER
    drawHero();

    // 9. CELEBRATION / SPARKLE PARTICLES
    drawParticles();

    requestAnimationFrame(render);
  }

  // Scenery around the castle
  function drawOutdoorScenery() {
    // Pine Trees
    const trees = [
      { x: 1, y: 1 }, { x: 1, y: 5 }, { x: 1, y: 9 }, { x: 1, y: 13 },
      { x: 19, y: 1 }, { x: 19, y: 5 }, { x: 19, y: 9 }, { x: 19, y: 13 },
      { x: 4, y: 0 }, { x: 16, y: 0 }, { x: 4, y: 16 }, { x: 16, y: 16 }
    ];

    trees.forEach(t => {
      const px = t.x * TILE + TILE / 2;
      const py = t.y * TILE + TILE / 2;

      // Shadow
      ctx.fillStyle = 'rgba(10, 16, 26, 0.4)';
      ctx.beginPath();
      ctx.ellipse(px, py + 8, 10, 5, 0, 0, Math.PI * 2);
      ctx.fill();

      // Trunk
      ctx.fillStyle = '#4A3728';
      ctx.fillRect(px - 2, py + 2, 4, 6);

      // Conical foliage layers
      ctx.fillStyle = '#1D3B31';
      ctx.beginPath();
      ctx.moveTo(px, py - 12);
      ctx.lineTo(px + 9, py + 3);
      ctx.lineTo(px - 9, py + 3);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#285244';
      ctx.beginPath();
      ctx.moveTo(px, py - 10);
      ctx.lineTo(px + 7, py + 1);
      ctx.lineTo(px - 7, py + 1);
      ctx.closePath();
      ctx.fill();
    });

    // Scattered Rocks
    const rocks = [{ x: 3, y: 15 }, { x: 17, y: 15 }, { x: 2, y: 0 }, { x: 18, y: 0 }];
    rocks.forEach(r => {
      ctx.fillStyle = '#3E4C5A';
      ctx.beginPath();
      ctx.ellipse(r.x * TILE + 8, r.y * TILE + 8, 6, 4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#546678';
      ctx.beginPath();
      ctx.ellipse(r.x * TILE + 7, r.y * TILE + 6, 4, 2, 0, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  // Stone floor tiles inside corridors
  function drawDungeonFloors() {
    for (let c = 2; c <= 18; c++) {
      for (let r = 2; r <= 14; r++) {
        if (!isWall(c, r)) {
          const x = c * TILE;
          const y = r * TILE;

          // Base Floor Paver
          ctx.fillStyle = ((c + r) % 2 === 0) ? '#435164' : '#3D4B5D';
          ctx.fillRect(x, y, TILE, TILE);

          // Subtle Paver Border
          ctx.strokeStyle = '#323E4E';
          ctx.lineWidth = 1;
          ctx.strokeRect(x + 0.5, y + 0.5, TILE - 1, TILE - 1);
        }
      }
    }
  }

  // 3D Stone Fortress Walls
  function drawStoneWalls() {
    walls.forEach(key => {
      const [c, r] = key.split(',').map(Number);
      const x = c * TILE;
      const y = r * TILE;

      // Wall Stone Face (Dark Slate)
      ctx.fillStyle = '#334155';
      ctx.fillRect(x, y, TILE, TILE);

      // Top Bevel Coping (Lighter Slate)
      ctx.fillStyle = '#475569';
      ctx.fillRect(x, y, TILE, 5);

      // Left Highlight Bevel
      ctx.fillStyle = '#3E4C59';
      ctx.fillRect(x, y + 5, 2, TILE - 5);

      // Bottom Shadow (Deep Navy)
      ctx.fillStyle = '#1E293B';
      ctx.fillRect(x, y + TILE - 3, TILE, 3);

      // Subtle Mortar Grid
      ctx.strokeStyle = '#1E293B';
      ctx.lineWidth = 1;
      ctx.strokeRect(x + 0.5, y + 0.5, TILE - 1, TILE - 1);
    });
  }

  // Doorways and Steps
  function drawDoorwaysAndStairs() {
    // Helper to draw a stone threshold with steps
    function drawStepThreshold(tileX, tileY, isExit = false) {
      const px = tileX * TILE;
      const py = tileY * TILE;

      ctx.fillStyle = '#2C3A4B';
      ctx.fillRect(px, py, TILE, TILE);

      // Stone Steps
      for (let i = 0; i < 3; i++) {
        ctx.fillStyle = '#4A5A6D';
        ctx.fillRect(px + 2, py + i * 8 + 2, TILE - 4, 3);
        ctx.fillStyle = '#1E293B';
        ctx.fillRect(px + 2, py + i * 8 + 5, TILE - 4, 2);
      }
    }

    // 1. South Entrance: (10, 14)
    drawStepThreshold(10, 14);

    // 2. South Room A Doorway: (10, 11)
    drawStepThreshold(10, 11);

    // 3. South Room B Doorway: (10, 9)
    drawStepThreshold(10, 9);

    // 4. North Room B Doorway: (10, 7)
    drawStepThreshold(10, 7);

    // 5. North Room A Doorway: (10, 5)
    drawStepThreshold(10, 5);

    // 6. North Exit Doorway at top: (10, 2) and (10, 1)
    drawStepThreshold(10, 2, true);

    // Golden Torchlit arch at top Exit (10, 1)
    const tx = 10 * TILE;
    const ty = 2 * TILE;
    const grad = ctx.createRadialGradient(tx + TILE / 2, ty, 2, tx + TILE / 2, ty, 34);
    grad.addColorStop(0, 'rgba(251, 191, 36, 0.55)');
    grad.addColorStop(0.5, 'rgba(245, 158, 11, 0.25)');
    grad.addColorStop(1, 'rgba(217, 119, 6, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(tx + TILE / 2, ty, 34, 0, Math.PI * 2);
    ctx.fill();
  }

  // Torches with radial light & animated flicker
  function drawWallTorches() {
    const torchLocs = [
      { x: 2, y: 6 }, { x: 2, y: 12 },
      { x: 18, y: 6 }, { x: 18, y: 12 },
      { x: 7, y: 13 }, { x: 13, y: 13 },
      { x: 10, y: 1 } // Exit torch
    ];

    torchLocs.forEach(t => {
      const px = t.x * TILE + TILE / 2;
      const py = t.y * TILE + TILE / 2;

      // Radial warm glow
      const flicker = Math.sin(animTick * 0.12 + px) * 2;
      const radius = 26 + flicker;
      const glow = ctx.createRadialGradient(px, py, 2, px, py, radius);
      glow.addColorStop(0, 'rgba(245, 158, 11, 0.35)');
      glow.addColorStop(0.6, 'rgba(217, 119, 6, 0.12)');
      glow.addColorStop(1, 'rgba(217, 119, 6, 0)');

      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(px, py, radius, 0, Math.PI * 2);
      ctx.fill();

      // Sconce Bracket
      ctx.fillStyle = '#1E293B';
      ctx.fillRect(px - 2, py + 1, 4, 6);

      // Flame
      ctx.fillStyle = '#F59E0B';
      ctx.beginPath();
      ctx.arc(px, py - 1, 3.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#FEF08A';
      ctx.beginPath();
      ctx.arc(px, py - 2, 1.8, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  // Key, Coins, Crates, and Treasure Chest
  function drawCollectiblesAndProps() {
    // 1. Golden Key at (3, 8)
    if (!collectibles.key.collected) {
      const kx = collectibles.key.x * TILE + TILE / 2;
      const ky = collectibles.key.y * TILE + TILE / 2 + Math.sin(animTick * 0.08) * 2;

      ctx.save();
      ctx.translate(kx, ky);
      ctx.rotate(-Math.PI / 4);

      // Key Ring
      ctx.strokeStyle = '#F59E0B';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(0, -6, 4, 0, Math.PI * 2);
      ctx.stroke();

      // Key Stem
      ctx.fillStyle = '#F59E0B';
      ctx.fillRect(-1.5, -2, 3, 10);

      // Key Teeth
      ctx.fillRect(1.5, 3, 3, 2);
      ctx.fillRect(1.5, 6, 3, 2);

      ctx.restore();
    }

    // 2. Gold Coins at (16, 8)
    if (!collectibles.coins.collected) {
      const cx = collectibles.coins.x * TILE + 4;
      const cy = collectibles.coins.y * TILE + 6;

      ctx.fillStyle = '#D97706';
      ctx.beginPath();
      ctx.ellipse(cx + 6, cy + 10, 6, 3.5, 0, 0, Math.PI * 2);
      ctx.ellipse(cx + 12, cy + 8, 6, 3.5, 0, 0, Math.PI * 2);
      ctx.ellipse(cx + 8, cy + 4, 6, 3.5, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#FBBF24';
      ctx.beginPath();
      ctx.ellipse(cx + 6, cy + 9, 5, 2.8, 0, 0, Math.PI * 2);
      ctx.ellipse(cx + 12, cy + 7, 5, 2.8, 0, 0, Math.PI * 2);
      ctx.ellipse(cx + 8, cy + 3, 5, 2.8, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // 3. Wooden Crates at (16, 3)
    const rx = collectibles.crates.x * TILE + 2;
    const ry = collectibles.crates.y * TILE + 2;

    ctx.fillStyle = '#78350F';
    ctx.fillRect(rx, ry, 22, 22);
    ctx.fillStyle = '#92400E';
    ctx.fillRect(rx + 2, ry + 2, 18, 18);
    ctx.strokeStyle = '#451A03';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(rx + 2, ry + 2, 18, 18);
    // Cross Planks
    ctx.beginPath();
    ctx.moveTo(rx + 2, ry + 2); ctx.lineTo(rx + 20, ry + 20);
    ctx.moveTo(rx + 20, ry + 2); ctx.lineTo(rx + 2, ry + 20);
    ctx.stroke();

    // 4. Golden Treasure Chest in Room B center: (10, 8)
    const chestX = collectibles.chest.x * TILE + 3;
    const chestY = collectibles.chest.y * TILE + 4;

    if (!collectibles.chest.opened) {
      // Closed Chest
      ctx.fillStyle = '#B45309';
      ctx.fillRect(chestX, chestY + 5, 20, 13);

      // Gold Trim
      ctx.fillStyle = '#F59E0B';
      ctx.fillRect(chestX, chestY + 3, 20, 4);
      ctx.fillRect(chestX + 2, chestY + 5, 3, 13);
      ctx.fillRect(chestX + 15, chestY + 5, 3, 13);

      // Front Latch
      ctx.fillStyle = '#FEF08A';
      ctx.fillRect(chestX + 8, chestY + 8, 4, 5);
      ctx.fillStyle = '#1E293B';
      ctx.fillRect(chestX + 9, chestY + 10, 2, 2);
    } else {
      // Opened Chest with Golden Radiance
      ctx.fillStyle = '#78350F';
      ctx.fillRect(chestX, chestY + 6, 20, 12);

      // Open Lid Tilted Up
      ctx.fillStyle = '#B45309';
      ctx.fillRect(chestX - 1, chestY - 2, 22, 6);

      // Radiating Jewels & Gold inside
      ctx.fillStyle = '#FBBF24';
      ctx.fillRect(chestX + 3, chestY + 6, 14, 5);
      ctx.fillStyle = '#60A5FA';
      ctx.fillRect(chestX + 5, chestY + 7, 3, 3);
      ctx.fillStyle = '#EC4899';
      ctx.fillRect(chestX + 12, chestY + 7, 3, 3);
    }
  }

  // Badges on Canvas matching Reference Image
  function drawCanvasBadges() {
    // Helper to draw pill badge
    function drawPill(text, x, y, bg = '#1E293B', fg = '#FFFFFF', border = '#334155') {
      ctx.save();
      ctx.font = 'bold 11px Inter, sans-serif';
      const textWidth = ctx.measureText(text).width;
      const pw = textWidth + 14;
      const ph = 18;
      const px = x - pw / 2;
      const py = y - ph / 2;

      ctx.fillStyle = bg;
      ctx.beginPath();
      ctx.roundRect(px, py, pw, ph, 9);
      ctx.fill();

      if (border) {
        ctx.strokeStyle = border;
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      ctx.fillStyle = fg;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, x, y);
      ctx.restore();
    }

    // 1. 'Outer Dungeon' Badge: on top-left outer wall
    drawPill('Outer Dungeon', 5.5 * TILE, 2 * TILE + 8, '#1E293B', '#F1F5F9', '#475569');

    // 2. 'Room A' Badge: over Room A doorway
    drawPill('Room A', 10.5 * TILE, 5 * TILE + 8, '#B7C4CF', '#1E293B', '#94A3B8');

    // 3. 'Room B' Badge: over Room B doorway
    drawPill('Room B', 10.5 * TILE, 7 * TILE + 8, '#B7C4CF', '#1E293B', '#94A3B8');

    // 4. '↑ Entrance' Badge: below bottom entrance
    drawPill('↑ Entrance', 10.5 * TILE, 15 * TILE + 2, '#1E293B', '#F1F5F9', '#334155');

    // 5. '↑ Exit' Badge: above top exit
    drawPill('↑ Exit', 10.5 * TILE, 0.8 * TILE + 2, '#1E293B', '#F1F5F9', '#334155');
  }

  // Player Adventurer Sprite
  function drawHero() {
    const px = player.visualX * TILE + TILE / 2;
    const py = player.visualY * TILE + TILE / 2;

    // Drop Shadow
    ctx.fillStyle = 'rgba(15, 23, 42, 0.45)';
    ctx.beginPath();
    ctx.ellipse(px, py + 8, 8, 4.5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Body (Blue Tunic)
    ctx.fillStyle = '#2563EB';
    ctx.fillRect(px - 6, py - 3, 12, 10);

    // Leather Belt & Buckle
    ctx.fillStyle = '#78350F';
    ctx.fillRect(px - 6, py + 3, 12, 2.5);
    ctx.fillStyle = '#F59E0B';
    ctx.fillRect(px - 1.5, py + 3, 3, 2.5);

    // Head & Hair
    ctx.fillStyle = '#654321';
    ctx.beginPath();
    ctx.arc(px, py - 8, 6.5, 0, Math.PI * 2);
    ctx.fill();

    // Face / Eyes depending on facing
    if (player.facing === 'down') {
      ctx.fillStyle = '#FBD38D'; // skin tone
      ctx.fillRect(px - 3.5, py - 7, 7, 5);
      ctx.fillStyle = '#1E293B'; // eyes
      ctx.fillRect(px - 2.5, py - 5, 1.5, 1.5);
      ctx.fillRect(px + 1, py - 5, 1.5, 1.5);
    } else if (player.facing === 'left') {
      ctx.fillStyle = '#FBD38D';
      ctx.fillRect(px - 5, py - 7, 4, 5);
      ctx.fillStyle = '#1E293B';
      ctx.fillRect(px - 4, py - 5, 1.5, 1.5);
    } else if (player.facing === 'right') {
      ctx.fillStyle = '#FBD38D';
      ctx.fillRect(px + 1, py - 7, 4, 5);
      ctx.fillStyle = '#1E293B';
      ctx.fillRect(px + 2.5, py - 5, 1.5, 1.5);
    }

    // Sword on Right Side
    ctx.fillStyle = '#CBD5E1';
    ctx.fillRect(px + 6, py - 4, 2, 11);
    ctx.fillStyle = '#D97706';
    ctx.fillRect(px + 4.5, py - 1, 5, 2);

    // Shield on Left Side
    ctx.fillStyle = '#3B82F6';
    ctx.beginPath();
    ctx.ellipse(px - 7, py + 2, 3, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#F59E0B';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Bobbing Green Indicator Triangle '▼' above player's head
    const triBob = Math.sin(animTick * 0.1) * 3;
    const triY = py - 18 + triBob;

    ctx.fillStyle = '#22C55E';
    ctx.beginPath();
    ctx.moveTo(px, triY + 5);
    ctx.lineTo(px - 4.5, triY);
    ctx.lineTo(px + 4.5, triY);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = '#15803D';
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  // Particle Effects
  function drawParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life -= p.decay;

      if (p.life <= 0) {
        particles.splice(i, 1);
        continue;
      }

      ctx.save();
      ctx.globalAlpha = p.life;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  // --------------------------------------------------------------------------
  // INITIAL RENDER & STARTUP
  // --------------------------------------------------------------------------
  updateUI();
  requestAnimationFrame(render);
});
