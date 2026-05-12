# Stacks & Queues — Easy Interview Questions

> **Audience**: Junior / phone screen / first technical round.
> **Goal**: Master the core stack/queue patterns — bracket matching, stack-as-undo, two-stack queue, sliding-window dequeue, monotonic stack.

---

## Q1. Valid Parentheses

> Return `true` if every opening bracket `( [ {` is closed by the matching closing bracket in the right order.

**Example**: `"()[]{}"` → `true`; `"(]"` → `false`.

```js
function isValid(s) {
  const match = { ')': '(', ']': '[', '}': '{' };
  const stack = [];
  for (const c of s) {
    if (c === '(' || c === '[' || c === '{') stack.push(c);
    else if (stack.pop() !== match[c]) return false;
  }
  return stack.length === 0;
}
```

- **Time**: O(n) · **Space**: O(n)
- **Pitfall**: Forgetting to check that the stack is **empty** at the end → `"((("` would pass.
- **Why a stack**: any closing bracket must match the **most recent** unmatched open — that's LIFO.

---

## Q2. Implement Queue using Stacks

> Build a queue (FIFO) using only stack primitives.

```js
class MyQueue {
  constructor() {
    this.in = [];
    this.out = [];
  }
  push(x) { this.in.push(x); }
  pop()   { this.peek(); return this.out.pop(); }
  peek() {
    if (this.out.length === 0) while (this.in.length) this.out.push(this.in.pop());
    return this.out[this.out.length - 1];
  }
  empty() { return this.in.length === 0 && this.out.length === 0; }
}
```

- **Time**: `push` O(1); `pop`/`peek` **amortized O(1)** (each element moves between stacks at most twice).
- **Pattern**: classic **two-stack queue** — the canonical example of amortized analysis.

---

## Q3. Implement Stack using Queues

> Build a stack (LIFO) using only queue primitives. Use **one** queue.

```js
class MyStack {
  constructor() { this.q = []; }
  push(x) {
    this.q.push(x);
    for (let i = 0; i < this.q.length - 1; i++) this.q.push(this.q.shift());  // rotate
  }
  pop()   { return this.q.shift(); }
  top()   { return this.q[0]; }
  empty() { return this.q.length === 0; }
}
```

- **Time**: `push` O(n); `pop`/`top` O(1).
- **Trick**: after each push, rotate so the newest element ends up at the front of the queue → `shift` always returns the most recent.
- **Two-queue alternative** flips the costs (cheap push, costly pop).

---

## Q4. Min Stack

> Stack with O(1) `push`, `pop`, `top`, **and** `getMin`.

```js
class MinStack {
  constructor() {
    this.stack = [];
    this.minStack = [];           // running minimum at each level
  }
  push(val) {
    this.stack.push(val);
    if (!this.minStack.length || val <= this.minStack[this.minStack.length - 1])
      this.minStack.push(val);
  }
  pop() {
    const v = this.stack.pop();
    if (v === this.minStack[this.minStack.length - 1]) this.minStack.pop();
  }
  top()    { return this.stack[this.stack.length - 1]; }
  getMin() { return this.minStack[this.minStack.length - 1]; }
}
```

- **Time**: O(1) per op · **Space**: O(n)
- **Pitfall**: use `<=` (not `<`) when pushing onto the min-stack — duplicates of the current min must also be tracked, else `pop` fails.

**Single-stack variant** (encodes diff): pushes `2 * val − currentMin` when val < currentMin. More memory-efficient but trickier — only show this if asked to optimize.

---

## Q5. Baseball Game

> Given operations like `["5","2","C","D","+"]`, evaluate per the rules:
> - integer → push the score
> - `"+"` → push (last + second-last)
> - `"D"` → push (last × 2)
> - `"C"` → cancel last
> Return the sum.

```js
function calPoints(operations) {
  const stack = [];
  for (const op of operations) {
    const n = stack.length;
    if (op === '+')      stack.push(stack[n - 1] + stack[n - 2]);
    else if (op === 'D') stack.push(stack[n - 1] * 2);
    else if (op === 'C') stack.pop();
    else                 stack.push(+op);
  }
  return stack.reduce((a, b) => a + b, 0);
}
```

- **Time**: O(n) · **Space**: O(n)

---

## Q6. Remove All Adjacent Duplicates In String

> Repeatedly remove adjacent equal letters until none remain.

**Example**: `"abbaca"` → `"ca"`.

```js
function removeDuplicates(s) {
  const stack = [];
  for (const c of s) {
    if (stack.length && stack[stack.length - 1] === c) stack.pop();
    else stack.push(c);
  }
  return stack.join('');
}
```

- **Time**: O(n) · **Space**: O(n)
- **Why a stack**: every character only ever needs to compare with the **most recent** survivor.

---

## Q7. Backspace String Compare

> Two strings; `'#'` represents backspace. Return `true` if they produce the same final string.

**Example**: `"ab#c", "ad#c"` → both `"ac"` → `true`.

```js
function backspaceCompare(s, t) {
  const build = str => {
    const stack = [];
    for (const c of str) c === '#' ? stack.pop() : stack.push(c);
    return stack.join('');
  };
  return build(s) === build(t);
}
```

- **Time**: O(m + n) · **Space**: O(m + n)

**Follow-up — O(1) space**: scan both strings from the right with two pointers, skipping over backspaces as they're seen.

---

## Q8. Make The String Great

> Repeatedly remove adjacent same-letter pairs of different case (e.g., `Aa` or `aA`).

**Example**: `"leEeetcode"` → `"leetcode"`.

```js
function makeGood(s) {
  const stack = [];
  for (const c of s) {
    const top = stack[stack.length - 1];
    if (top && top !== c && top.toLowerCase() === c.toLowerCase()) stack.pop();
    else stack.push(c);
  }
  return stack.join('');
}
```

- **Time**: O(n) · **Space**: O(n)

---

## Q9. Next Greater Element I

> For each value in `nums1` (subset of `nums2`), find the next greater value to its right in `nums2`. Return -1 if none.

**Example**: `nums1=[4,1,2], nums2=[1,3,4,2]` → `[-1, 3, -1]`.

```js
function nextGreaterElement(nums1, nums2) {
  const next = new Map();
  const stack = [];                 // monotonic decreasing
  for (const n of nums2) {
    while (stack.length && stack[stack.length - 1] < n) next.set(stack.pop(), n);
    stack.push(n);
  }
  return nums1.map(x => next.get(x) ?? -1);
}
```

- **Time**: O(m + n) · **Space**: O(n)
- **Pattern**: classic **monotonic stack** — every element pushed/popped at most once.

---

## Q10. Number of Recent Calls

> Stream of pings (timestamps). For each ping `t`, return how many were in `[t − 3000, t]`.

```js
class RecentCounter {
  constructor() { this.q = []; this.head = 0; }
  ping(t) {
    this.q.push(t);
    while (this.q[this.head] < t - 3000) this.head++;
    return this.q.length - this.head;
  }
}
```

- **Time**: amortized O(1) per `ping` (each timestamp advances `head` at most once).
- **Pitfall**: don't use `q.shift()` — would be O(n).

---

## Q11. Final Prices With a Special Discount in a Shop

> For each `price[i]`, discount = the next `price[j]` (j > i) with `price[j] ≤ price[i]`. Return the final price array.

**Example**: `[8,4,6,2,3]` → `[4,2,4,2,3]`.

```js
function finalPrices(prices) {
  const out = prices.slice();
  const stack = [];                 // indices, prices monotone increasing
  for (let i = 0; i < prices.length; i++) {
    while (stack.length && prices[stack[stack.length - 1]] >= prices[i]) {
      out[stack.pop()] -= prices[i];
    }
    stack.push(i);
  }
  return out;
}
```

- **Time**: O(n) · **Space**: O(n)
- **Pattern**: monotonic stack again. The "next less or equal" variant of next-greater-element.

---

## Q12. Build an Array With Stack Operations

> Given a `target` array (strictly increasing values from 1..n) and an integer n, return the sequence of `"Push" / "Pop"` operations needed to construct `target` from a stream of `1, 2, ..., n`.

```js
function buildArray(target, n) {
  const out = [];
  let i = 0;
  for (let v = 1; v <= n && i < target.length; v++) {
    out.push('Push');
    if (target[i] !== v) out.push('Pop');
    else i++;
  }
  return out;
}
```

- **Time**: O(n) · **Space**: O(n)
- **Pattern**: simulate the stack operations directly without instantiating a stack.

---

## Q13. Crawler Log Folder

> Operations: `"../"` (up), `"./"` (stay), `"x/"` (down into folder x). Return min ops to return to root.

```js
function minOperations(logs) {
  let depth = 0;
  for (const log of logs) {
    if (log === '../') depth = Math.max(0, depth - 1);
    else if (log !== './') depth++;
  }
  return depth;
}
```

- **Time**: O(n) · **Space**: O(1)
- **Why no stack needed**: only the depth matters, not which folders. A counter suffices.

---

## Q14. Sort Stack (using Another Stack)

> Sort a stack ascending using only one auxiliary stack.

```js
function sortStack(stack) {
  const aux = [];
  while (stack.length) {
    const v = stack.pop();
    while (aux.length && aux[aux.length - 1] > v) stack.push(aux.pop());
    aux.push(v);
  }
  while (aux.length) stack.push(aux.pop());
  return stack;
}
```

- **Time**: O(n²) · **Space**: O(n)
- **Pattern**: insertion-sort against the auxiliary stack. After this loop, `aux` is descending; flush back to make `stack` ascending from top.

---

## Q15. Implement Stack via Single Recursion

> Reverse a stack using only recursion (no extra data structures).

```js
function reverseStack(stack) {
  if (!stack.length) return;
  const top = stack.pop();
  reverseStack(stack);
  insertAtBottom(stack, top);
}
function insertAtBottom(stack, x) {
  if (!stack.length) { stack.push(x); return; }
  const top = stack.pop();
  insertAtBottom(stack, x);
  stack.push(top);
}
```

- **Time**: O(n²) · **Space**: O(n) recursion stack
- **Why this matters**: shows that the **call stack** can act as auxiliary storage — interview classic.

---

## Patterns Cheatsheet (Easy)

| Pattern                    | Trigger                                              | Examples here    |
| -------------------------- | ---------------------------------------------------- | ---------------- |
| **Bracket-match stack**    | Validate balanced delimiters                         | Q1               |
| **Two-stack queue**        | Queue from stacks, amortized O(1)                    | Q2               |
| **Rotate-on-push queue**   | Stack from queues                                    | Q3               |
| **Mirror stack**           | O(1) tracking of running min/max                     | Q4               |
| **Stack as undo / history**| "Cancel last", backspace                             | Q5, Q7           |
| **Adjacent-pair stack**    | Repeatedly cancel neighbors                          | Q6, Q8           |
| **Monotonic stack**        | Next greater / smaller / span                        | Q9, Q11          |
| **Sliding-window queue**   | "Last X seconds", with head index                    | Q10              |
| **Counter instead of stack**| When only depth/count matters                       | Q13              |
| **Two-stack sort**         | Insertion sort on a stack                            | Q14              |

---

## Common Interviewer Follow-Ups

1. *"Can you do it with O(1) space?"* — backspace compare with two pointers from the right.
2. *"Can you handle multiple types of brackets?"* — needs an actual stack (counter doesn't suffice).
3. *"What's the amortized cost?"* — say "amortized O(1)" for two-stack queue and explain *why*.
4. *"What if the input is a stream?"* — `RecentCounter` style; can't index back, only append + advance head.
5. *"What's the difference between recursion and iteration with an explicit stack?"* — recursion uses the call stack, iteration uses the heap. Iteration is safer for deep inputs.
