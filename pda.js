/**
 * ============================================================================
 * Dungeon Quest: Pushdown Automaton (PDA) Engine
 * Theory of Computation FA-2 — PCCOE
 *
 * Formal 7-Tuple: M = (Q, Σ, Γ, δ, q₀, Z₀, F)
 * States: Q = { q₀, q₁, qf }
 * Alphabet: Σ = { a, b, f }  (a: Enter, b: Exit, f: Finish)
 * Stack Alphabet: Γ = { Z₀, D, A }  (Z₀: Base, D: Outer Dungeon, A: Nested Room)
 * Initial State: q₀
 * Initial Stack: Z₀
 * Final State: F = { qf }
 *
 * 6 Deterministic Transitions:
 * 1. δ(q₀, a, Z₀) = (q₁, DZ₀)  [Enter Outer Dungeon: Push D]
 * 2. δ(q₁, a, D)  = (q₁, AD)   [Enter 1st Nested Room: Push A]
 * 3. δ(q₁, a, A)  = (q₁, AA)   [Enter Deeper Room: Push A]
 * 4. δ(q₁, b, A)  = (q₁, ε)    [Exit Nested Room: Pop A]
 * 5. δ(q₁, b, D)  = (q₀, ε)    [Exit Outer Dungeon: Pop D, Return to q₀]
 * 6. δ(q₀, f, Z₀) = (qf, Z₀)   [Finish Game: Accepted by qf]
 * ============================================================================
 */

class DungeonPDA {
  constructor() {
    this.reset();
  }

  reset() {
    this.state = 'q0'; // 'q0', 'q1', 'qf'
    // Stack representation: index 0 is TOP OF STACK (top on left)
    this.stack = ['Z0'];
    this.inputSequence = [];
    this.lastSymbol = null;
    this.lastOperation = 'INITIALIZE';
    this.lastRuleNumber = null;
    this.history = [];
    this.status = 'READY'; // 'READY', 'VALID', 'REJECTED', 'ACCEPTED'
    this.message = 'Automaton initialized. Player starts outside dungeon in initial state q₀.';
  }

  /**
   * Returns textual stack string with top on the LEFT.
   * e.g., ['A', 'D', 'Z0'] returns "ADZ₀"
   */
  getStackString() {
    return this.stack.map(s => s === 'Z0' ? 'Z₀' : s).join('');
  }

  getStackTop() {
    return this.stack.length > 0 ? this.stack[0] : null;
  }

  getNestingDepth() {
    // Count rooms: D counts as 1, each A counts as 1
    return this.stack.filter(s => s === 'D' || s === 'A').length;
  }

  isFinishValid() {
    return this.state === 'q0' && this.getStackTop() === 'Z0' && this.stack.length === 1;
  }

  /**
   * Evaluates a player action symbol against the 6 deterministic PDA rules.
   * @param {string} symbol - 'a', 'b', or 'f'
   * @returns {Object} result metadata
   */
  processInput(symbol) {
    if (this.state === 'qf') {
      return {
        success: false,
        reason: 'Game already completed in final accepting state qf. Click Reset to start a new quest.',
        rule: null,
        status: 'REJECTED'
      };
    }

    const currentTop = this.getStackTop();
    const prevStackStr = this.getStackString();
    const prevState = this.state;
    const topPretty = currentTop === 'Z0' ? 'Z₀' : currentTop;

    let matchedRule = null;
    let nextState = null;
    let stackOperation = null;
    let description = '';

    // RULE 1: δ(q₀, a, Z₀) = (q₁, DZ₀)
    if (prevState === 'q0' && symbol === 'a' && currentTop === 'Z0') {
      matchedRule = 1;
      nextState = 'q1';
      this.stack = ['D', 'Z0'];
      stackOperation = 'PUSH D';
      description = 'Rule 1: Player enters outer dungeon. PUSH "D" onto stack. State transitioned to q₁.';
    }
    // RULE 2: δ(q₁, a, D) = (q₁, AD)
    else if (prevState === 'q1' && symbol === 'a' && currentTop === 'D') {
      matchedRule = 2;
      nextState = 'q1';
      this.stack = ['A', ...this.stack];
      stackOperation = 'PUSH A';
      description = 'Rule 2: Player enters 1st nested chamber. PUSH "A" above "D". State remains in q₁.';
    }
    // RULE 3: δ(q₁, a, A) = (q₁, AA)
    else if (prevState === 'q1' && symbol === 'a' && currentTop === 'A') {
      matchedRule = 3;
      nextState = 'q1';
      this.stack = ['A', ...this.stack];
      stackOperation = 'PUSH A';
      description = 'Rule 3: Player enters deeper nested chamber. PUSH "A" above "A". State remains in q₁.';
    }
    // RULE 4: δ(q₁, b, A) = (q₁, ε)
    else if (prevState === 'q1' && symbol === 'b' && currentTop === 'A') {
      matchedRule = 4;
      nextState = 'q1';
      this.stack.shift(); // Remove top symbol
      stackOperation = 'POP A';
      description = 'Rule 4: Player exits nested chamber. POP "A" (LIFO reverse order). State remains in q₁.';
    }
    // RULE 5: δ(q₁, b, D) = (q₀, ε)
    else if (prevState === 'q1' && symbol === 'b' && currentTop === 'D') {
      matchedRule = 5;
      nextState = 'q0';
      this.stack.shift(); // Remove top D
      stackOperation = 'POP D';
      description = 'Rule 5: Player exits outermost dungeon. POP "D", returning outside to initial state q₀.';
    }
    // RULE 6: δ(q₀, f, Z₀) = (qf, Z₀)
    else if (prevState === 'q0' && symbol === 'f' && currentTop === 'Z0') {
      matchedRule = 6;
      nextState = 'qf';
      // Stack remains Z0
      stackOperation = 'ACCEPT';
      description = 'Rule 6: Player finishes game outside with empty dungeon stack (Z₀). ACCEPTED by final state qf!';
    }
    // REJECTION: No transition exists
    else {
      let reason = '';
      if (symbol === 'b' && prevState === 'q0') {
        reason = `REJECTED: δ(q₀, b, ${topPretty}) is UNDEFINED. The player is already outside the dungeon; cannot exit any further!`;
      } else if (symbol === 'f' && prevState === 'q1') {
        reason = `REJECTED: δ(q₁, f, ${topPretty}) is UNDEFINED. Cannot finish while still inside dungeon rooms (stack: ${prevStackStr}). You must exit all rooms first!`;
      } else if (symbol === 'f' && currentTop !== 'Z0') {
        reason = `REJECTED: δ(${prevState}, f, ${topPretty}) is UNDEFINED. Stack must contain only base marker Z₀ to finish.`;
      } else {
        reason = `REJECTED: No transition defined for δ(${prevState}, '${symbol}', ${topPretty}). Machine halts immediately without altering state or stack.`;
      }

      this.status = 'REJECTED';
      this.message = reason;

      this.history.unshift({
        step: this.history.length + 1,
        input: symbol,
        rule: 'None (Undefined)',
        prevState: prevState,
        nextState: prevState,
        prevStack: prevStackStr,
        newStack: prevStackStr,
        op: 'REJECTED',
        status: 'REJECTED',
        description: reason
      });

      return {
        success: false,
        reason: reason,
        rule: null,
        status: 'REJECTED'
      };
    }

    // Apply valid transition
    this.state = nextState;
    this.inputSequence.push(symbol);
    this.lastSymbol = symbol;
    this.lastOperation = stackOperation;
    this.lastRuleNumber = matchedRule;
    this.status = (nextState === 'qf') ? 'ACCEPTED' : 'VALID';
    this.message = description;

    const newStackStr = this.getStackString();

    const historyRecord = {
      step: this.history.length + 1,
      input: symbol,
      rule: `Rule ${matchedRule}`,
      prevState: prevState,
      nextState: nextState,
      prevStack: prevStackStr,
      newStack: newStackStr,
      op: stackOperation,
      status: this.status,
      description: description
    };

    this.history.unshift(historyRecord);

    return {
      success: true,
      rule: matchedRule,
      state: nextState,
      stack: [...this.stack],
      stackString: newStackStr,
      operation: stackOperation,
      message: description,
      status: this.status
    };
  }
}

// Export for module or browser environments
if (typeof module !== 'undefined' && module.exports) {
  module.exports = DungeonPDA;
}
