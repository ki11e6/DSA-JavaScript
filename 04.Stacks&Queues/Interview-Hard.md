# Stacks & Queues — Hard Interview Questions

> **Audience**: Senior / FAANG on-site final rounds.
> **Goal**: Multi-stack expression parsers, monotonic-stack histograms, monotonic-deque sliding windows, two-heap median tracking.

---

## Q1. Largest Rectangle in Histogram

> Largest rectangle area among adjacent bars of given heights.

**Example**: `[2,1,5,6,2,3]` → `10`.

```js
function largestRectangleArea(h) {
  const stack = [];                     // indices of bars in increasing height
  let best = 0;
  for (let i = 0; i <= h.length; i++) {
    const cur = i === h.length ? 0 : h[i];
    while (stack.length && h[stack[stack.length - 1]] > cur) {
      const top = stack.pop();
      const left = stack.length ? stack[stack.length - 1] : -1;
      best = Math.max(best, h[top] * (i - left - 1));
    }
    stack.push(i);
  }
  return best;
}
```

- **Time**: O(n) · **Space**: O(n)
- **Trick**: append a sentinel `0` to flush the stack at the end.
- **Pattern**: monotonic increasing stack — for every popped bar, the rectangle's height is its own and the width is bounded by the new top (left) and `i` (right).

---

## Q2. Maximal Rectangle (in a 0/1 Matrix)

> Largest rectangle of all-1s in a binary matrix.

```js
function maximalRectangle(matrix) {
  if (!matrix.length) return 0;
  const cols = matrix[0].length;
  const heights = new Array(cols).fill(0);
  let best = 0;
  for (const row of matrix) {
    for (let c = 0; c < cols; c++) heights[c] = row[c] === '1' ? heights[c] + 1 : 0;
    best = Math.max(best, largestRectangleArea(heights));
  }
  return best;
}
```

- **Time**: O(m · n) · **Space**: O(n)
- **Reduction**: each row defines a histogram (heights of consecutive 1s above). Run Q1 per row.

---

## Q3. Sliding Window Maximum

> Max of every window of size `k` in `nums`.

**Example**: `[1,3,-1,-3,5,3,6,7], k=3` → `[3,3,5,5,6,7]`.

```js
function maxSlidingWindow(nums, k) {
  const dq = [];                     // indices, values monotone decreasing
  const out = [];
  for (let i = 0; i < nums.length; i++) {
    if (dq.length && dq[0] <= i - k) dq.shift();
    while (dq.length && nums[dq[dq.length - 1]] < nums[i]) dq.pop();
    dq.push(i);
    if (i >= k - 1) out.push(nums[dq[0]]);
  }
  return out;
}
```

- **Time**: O(n) · **Space**: O(k)
- **Pattern**: **monotonic deque**. Each index pushed/popped at most once.
- **Production note**: `dq.shift()` is O(n) on a JS array; for production use a real deque (linked-list or ring-buffer based).

---

## Q4. Trapping Rain Water — Stack Approach

> Already covered in `01.Array/Interview-Hard.md` Q1 with a two-pointer O(1)-space solution. The **stack** approach is conceptually cleaner for showing how monotonic stacks generalize:

```js
function trap(h) {
  const stack = [];                  // indices, heights decreasing
  let total = 0;
  for (let i = 0; i < h.length; i++) {
    while (stack.length && h[stack[stack.length - 1]] < h[i]) {
      const bottom = stack.pop();
      if (!stack.length) break;
      const left = stack[stack.length - 1];
      const width = i - left - 1;
      const height = Math.min(h[left], h[i]) - h[bottom];
      total += width * height;
    }
    stack.push(i);
  }
  return total;
}
```

- **Time**: O(n) · **Space**: O(n)
- **Pattern**: when a higher bar appears, it bounds the water above the popped bottom — left bar (new top of stack) and right bar (current i) form the walls.

---

## Q5. Basic Calculator (`+`, `−`, parentheses)

> Evaluate an integer expression with `+`, `−`, parentheses, and spaces. No `*` or `/`.

**Example**: `"(1+(4+5+2)-3)+(6+8)"` → `23`.

```js
function calculate(s) {
  const stack = [];
  let result = 0, num = 0, sign = 1;
  for (const c of s) {
    if (c >= '0' && c <= '9') num = num * 10 + +c;
    else if (c === '+' || c === '-') {
      result += sign * num;
      num = 0;
      sign = c === '+' ? 1 : -1;
    } else if (c === '(') {
      stack.push(result);             // bookmark result before paren
      stack.push(sign);               // bookmark sign before paren
      result = 0;
      sign = 1;
    } else if (c === ')') {
      result += sign * num;
      num = 0;
      result *= stack.pop();          // multiply by sign before paren
      result += stack.pop();          // add result before paren
    }
    // whitespace: skip
  }
  return result + sign * num;
}
```

- **Time**: O(n) · **Space**: O(depth)
- **Pattern**: stack saves the **left-of-paren context** (`result`, `sign`); paren contents collapse into a single number to add to it.

---

## Q6. Basic Calculator II (`+`, `−`, `*`, `/`, no parens)

> Same operators but with **precedence**: `*` and `/` bind tighter than `+`/`−`.

**Example**: `"3+2*2"` → `7`; `" 3/2 "` → `1`.

```js
function calculate2(s) {
  const stack = [];
  let num = 0, op = '+';
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (c >= '0' && c <= '9') num = num * 10 + +c;
    if ((c !== ' ' && (c < '0' || c > '9')) || i === s.length - 1) {
      if (op === '+')      stack.push(num);
      else if (op === '-') stack.push(-num);
      else if (op === '*') stack.push(stack.pop() * num);
      else                 stack.push(Math.trunc(stack.pop() / num));
      op = c;
      num = 0;
    }
  }
  return stack.reduce((a, b) => a + b, 0);
}
```

- **Time**: O(n) · **Space**: O(n)
- **Pattern**: defer applying the **previous** operator until the next operator (or end-of-string) is seen — `*` / `/` collapse into the top of stack instead of waiting.
- **Pitfall**: division must truncate toward zero — `Math.trunc(a / b)`, not `Math.floor`.

**Calculator III** (mix of all four operators **and** parentheses) — combine techniques: recurse on `(...)` or use a parens stack on top of the precedence-aware approach.

---

## Q7. Maximum Frequency Stack

> Push values; `pop` returns the most-frequent value. Tiebreak by most-recent.

```js
class FreqStack {
  constructor() {
    this.freq = new Map();             // val → frequency
    this.group = new Map();            // frequency → stack of values pushed at that frequency
    this.maxFreq = 0;
  }
  push(val) {
    const f = (this.freq.get(val) ?? 0) + 1;
    this.freq.set(val, f);
    if (!this.group.has(f)) this.group.set(f, []);
    this.group.get(f).push(val);
    if (f > this.maxFreq) this.maxFreq = f;
  }
  pop() {
    const top = this.group.get(this.maxFreq);
    const val = top.pop();
    this.freq.set(val, this.freq.get(val) - 1);
    if (top.length === 0) this.maxFreq--;
    return val;
  }
}
```

- **Time**: O(1) per op · **Space**: O(n)
- **Trick**: maintain a **stack per frequency level**. Tiebreak (most-recent at the same frequency) is automatic.
- **Why not a heap**: `O(log n)` per op vs `O(1)` here — the frequency-stack design exploits that frequencies only change by ±1.

---

## Q8. Find Median from Data Stream

> `addNum` and `findMedian` on an unbounded stream.

```js
class MedianFinder {
  constructor() {
    const PriorityQueue = require('./priorityQueue.js');
    this.lower = new PriorityQueue((a, b) => b - a);   // max-heap of lower half
    this.upper = new PriorityQueue((a, b) => a - b);   // min-heap of upper half
  }
  addNum(num) {
    this.lower.push(num);
    this.upper.push(this.lower.pop());                 // ensure all of lower ≤ all of upper
    if (this.upper.size() > this.lower.size()) this.lower.push(this.upper.pop());  // keep lower ≥ upper
  }
  findMedian() {
    if (this.lower.size() > this.upper.size()) return this.lower.peek();
    return (this.lower.peek() + this.upper.peek()) / 2;
  }
}
```

- **Time**: `addNum` O(log n), `findMedian` O(1) · **Space**: O(n)
- **Pattern**: **two heaps** — max-heap of the lower half, min-heap of the upper half. Median is the top of one (or the average of both tops when sizes match).
- **Invariant**: `lower.size === upper.size` or `lower.size === upper.size + 1`.

**Follow-up — Sliding Window Median**: harder because removing an arbitrary element from a heap is O(n). Use **lazy deletion** (a `delayed` map) plus careful re-balancing.

---

## Q9. Verify Preorder Serialization of a Binary Tree

> Given a comma-separated preorder traversal where `'#'` means null, return `true` iff it could correspond to a valid binary tree.

**Example**: `"9,3,4,#,#,1,#,#,2,#,6,#,#"` → `true`; `"1,#"` → `false`.

```js
function isValidSerialization(preorder) {
  let slots = 1;                       // start with one slot for the root
  for (const t of preorder.split(',')) {
    if (slots === 0) return false;     // would consume a non-existent slot
    slots += t === '#' ? -1 : 1;       // null fills 1 slot; non-null fills 1, opens 2 → +1
  }
  return slots === 0;
}
```

- **Time**: O(n) · **Space**: O(n) for the split (or O(1) if you parse in-place).
- **Pattern**: think of the traversal as a **slot accounting** problem — every non-null node consumes one slot and creates two; every null consumes one. Valid iff slots end at 0 and never go negative.

---

## Q10. Tag Validator

> Validate a Code-Snippet style HTML-tag string with `<TAG_NAME>...</TAG_NAME>`, `<![CDATA[...]]>`, and balanced nesting.

```js
function isValid(code) {
  const stack = [];
  let i = 0;
  if (code[0] !== '<' || code[code.length - 1] !== '>') return false;
  while (i < code.length) {
    if (i > 0 && stack.length === 0) return false;
    if (code.startsWith('<![CDATA[', i)) {
      const end = code.indexOf(']]>', i + 9);
      if (end === -1) return false;
      i = end + 3;
    } else if (code.startsWith('</', i)) {
      const close = code.indexOf('>', i + 2);
      if (close === -1) return false;
      const tag = code.slice(i + 2, close);
      if (!isValidTagName(tag) || stack.pop() !== tag) return false;
      i = close + 1;
      if (stack.length === 0 && i !== code.length) return false;
    } else if (code[i] === '<') {
      const close = code.indexOf('>', i + 1);
      if (close === -1) return false;
      const tag = code.slice(i + 1, close);
      if (!isValidTagName(tag)) return false;
      stack.push(tag);
      i = close + 1;
    } else {
      i++;
    }
  }
  return stack.length === 0;
}
function isValidTagName(t) {
  return t.length >= 1 && t.length <= 9 && /^[A-Z]+$/.test(t);
}
```

- **Time**: O(n) · **Space**: O(n)
- **Pattern**: **stack of open tags** + careful state machine for the three syntactic constructs (open, close, CDATA).

---

## Patterns Cheatsheet (Hard)

| Pattern                            | Trigger                                                          |
| ---------------------------------- | ---------------------------------------------------------------- |
| **Monotonic stack of indices**     | Histogram, max-rectangle in matrix, trap rain water              |
| **Monotonic deque**                | Sliding window min/max in O(n)                                   |
| **Stack-bookmark for parens**      | Calculator I, expression parsing                                 |
| **Defer-operator stack**           | Calculator II, precedence handling                               |
| **Frequency-of-stacks**            | Max-Frequency Stack — O(1) for push/pop on a multiset of priorities |
| **Two heaps**                      | Streaming median, scheduling balanced workloads                  |
| **Slot accounting**                | Validate preorder serialization, parens balance                  |
| **Stack of open tokens**           | HTML/XML/code-block validators                                   |

---

## Senior Communication Tips

1. **Name the technique up front.** "This is a monotonic stack." / "This is two heaps with a balance invariant." Saves the interviewer 30 seconds of pattern-matching.
2. **State the invariant of the stack/queue.** "The stack holds indices of bars in increasing height." Bugs nearly disappear once invariants are explicit.
3. **Explain why O(n) despite an inner `while`**: amortized — every index is pushed/popped at most once.
4. **For calculators, distinguish between deferring the operator and bookmarking the context.** Calculator I and II have different stack uses; conflating them is a common mistake.
5. **For median streaming, state the invariant**: `lower.size === upper.size` or `lower.size === upper.size + 1`. Then explain why `addNum` swaps once and rebalances if needed.
6. **Edge cases for parsers**: empty input, single token, deeply nested, mismatched, leading/trailing whitespace, integer overflow on long expressions.
