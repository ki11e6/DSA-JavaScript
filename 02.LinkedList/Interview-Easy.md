# LinkedList — Easy Interview Questions

> **Audience**: Junior / phone screen / first technical round.
> **Goal**: Demonstrate fluent pointer manipulation, two-pointer technique, dummy-node pattern.
> **Convention** (matches the repo's existing code and LeetCode):
>
> ```js
> class ListNode {
>   constructor(val = 0, next = null) { this.val = val; this.next = next; }
> }
> ```

---

## Q1. Reverse a Linked List

> Reverse a singly linked list. Return the new head.

**Example**: `1→2→3→4→5` → `5→4→3→2→1`

#### Approach 1 — Iterative (3 Pointers)

```js
function reverseList(head) {
  let prev = null, curr = head;
  while (curr) {
    const next = curr.next;   // cache before overwriting
    curr.next = prev;
    prev = curr;
    curr = next;
  }
  return prev;
}
```

- **Time**: O(n) · **Space**: O(1)
- **Pitfall**: Cache `next` *before* `curr.next = prev` — the #1 bug on this problem.

#### Approach 2 — Recursive

```js
function reverseList(head) {
  if (!head || !head.next) return head;
  const newHead = reverseList(head.next);
  head.next.next = head;     // make next node point back
  head.next = null;          // current head becomes tail
  return newHead;
}
```

- **Time**: O(n) · **Space**: O(n) stack
- **Tradeoff**: Cleaner code, but stack overflow on very long lists.

**Follow-ups**:
- Reverse a sublist between positions m..n? → Medium.
- Reverse in groups of k? → Hard.

---

## Q2. Linked List Cycle (Detect)

> Return `true` if the list has a cycle, else `false`.

#### Approach 1 — Hash Set

```js
function hasCycle(head) {
  const seen = new Set();
  while (head) {
    if (seen.has(head)) return true;
    seen.add(head);
    head = head.next;
  }
  return false;
}
```

- **Time**: O(n) · **Space**: O(n)

#### Approach 2 — Floyd's Tortoise & Hare (O(1) Space)

```js
function hasCycle(head) {
  let slow = head, fast = head;
  while (fast && fast.next) {
    slow = slow.next;
    fast = fast.next.next;
    if (slow === fast) return true;
  }
  return false;
}
```

- **Time**: O(n) · **Space**: O(1)
- **Why it works**: inside a cycle, the gap closes by 1 per step → they meet in ≤ cycle-length iterations.

**Follow-up — find the cycle's start node**:

```js
function detectCycle(head) {
  let slow = head, fast = head;
  while (fast && fast.next) {
    slow = slow.next; fast = fast.next.next;
    if (slow === fast) {
      let p = head;
      while (p !== slow) { p = p.next; slow = slow.next; }
      return p;
    }
  }
  return null;
}
```

---

## Q3. Middle of the Linked List

> For a list of length n, return the **n/2-th** node (0-indexed). For even length, return the **second** middle.

**Example**: `1→2→3→4→5` → node `3`; `1→2→3→4→5→6` → node `4`.

```js
function middleNode(head) {
  let slow = head, fast = head;
  while (fast && fast.next) {
    slow = slow.next;
    fast = fast.next.next;
  }
  return slow;
}
```

- **Time**: O(n) · **Space**: O(1)

**First-middle variant** (used when splitting for merge sort):

```js
function firstMiddle(head) {
  let slow = head, fast = head;
  while (fast.next && fast.next.next) {
    slow = slow.next;
    fast = fast.next.next;
  }
  return slow;
}
// 1→2→3→4 returns node 2 (so slow.next = node 3 starts the second half)
```

---

## Q4. Merge Two Sorted Lists

> Merge two sorted lists into one sorted list.

```js
function mergeTwoLists(l1, l2) {
  const dummy = new ListNode();
  let tail = dummy;
  while (l1 && l2) {
    if (l1.val <= l2.val) { tail.next = l1; l1 = l1.next; }
    else                  { tail.next = l2; l2 = l2.next; }
    tail = tail.next;
  }
  tail.next = l1 || l2;
  return dummy.next;
}
```

- **Time**: O(m + n) · **Space**: O(1) — reuses existing nodes.
- **Trick**: dummy node lets us avoid a head-special-case branch.

**Recursive variant** (O(m+n) stack):

```js
function mergeTwoLists(l1, l2) {
  if (!l1) return l2;
  if (!l2) return l1;
  if (l1.val <= l2.val) { l1.next = mergeTwoLists(l1.next, l2); return l1; }
  l2.next = mergeTwoLists(l1, l2.next);
  return l2;
}
```

---

## Q5. Remove Duplicates from Sorted List

> Delete duplicates from a sorted list, keeping one of each.

**Example**: `1→1→2→3→3` → `1→2→3`

```js
function deleteDuplicates(head) {
  let curr = head;
  while (curr && curr.next) {
    if (curr.val === curr.next.val) curr.next = curr.next.next;
    else curr = curr.next;
  }
  return head;
}
```

- **Time**: O(n) · **Space**: O(1)
- **Pitfall**: Don't advance `curr` when you delete — the new `curr.next` might also be a duplicate.

**Follow-up — Remove duplicates leaving none** (LeetCode 82, Medium): if a value repeats, delete *all* copies.

---

## Q6. Palindrome Linked List

> Return `true` if the list reads the same forward and backward.

#### Approach 1 — Convert to Array

```js
function isPalindrome(head) {
  const a = [];
  while (head) { a.push(head.val); head = head.next; }
  for (let l = 0, r = a.length - 1; l < r; l++, r--)
    if (a[l] !== a[r]) return false;
  return true;
}
```

- **Time**: O(n) · **Space**: O(n)

#### Approach 2 — Reverse Second Half (O(1) Space)

```js
function isPalindrome(head) {
  if (!head || !head.next) return true;

  // 1. Find first middle
  let slow = head, fast = head;
  while (fast.next && fast.next.next) {
    slow = slow.next; fast = fast.next.next;
  }

  // 2. Reverse second half
  let prev = null, curr = slow.next;
  while (curr) {
    const next = curr.next;
    curr.next = prev;
    prev = curr;
    curr = next;
  }

  // 3. Compare
  let p1 = head, p2 = prev;
  while (p2) {
    if (p1.val !== p2.val) return false;
    p1 = p1.next; p2 = p2.next;
  }
  return true;
}
```

- **Time**: O(n) · **Space**: O(1)
- **Polite mode**: restore the list by reversing the second half again.

---

## Q7. Intersection of Two Linked Lists

> Find the node where two singly linked lists intersect (same node by reference, not by value).

#### Approach 1 — Hash Set

- Push all nodes of A into a Set; walk B looking for first match. **O(m+n) time / O(m) space.**

#### Approach 2 — Two-Pointer Length Equalization (O(1) Space)

```js
function getIntersectionNode(headA, headB) {
  let a = headA, b = headB;
  while (a !== b) {
    a = a ? a.next : headB;
    b = b ? b.next : headA;
  }
  return a;     // null if no intersection (both reach null on the same step)
}
```

- **Time**: O(m + n) · **Space**: O(1)
- **Why it works**: each pointer travels distance `m + n` before they synchronize at the intersection.
- **Pitfall**: `a = a.next` skipping the `null` step would loop forever — the `a ? a.next : headB` lets both pointers visit `null` exactly once, which terminates the no-intersection case.

---

## Q8. Remove Linked List Elements (by Value)

> Delete all nodes with `val === target`. Return new head.

```js
function removeElements(head, target) {
  const dummy = new ListNode(0, head);
  let curr = dummy;
  while (curr.next) {
    if (curr.next.val === target) curr.next = curr.next.next;
    else curr = curr.next;
  }
  return dummy.next;
}
```

- **Time**: O(n) · **Space**: O(1)
- **Why dummy**: target may be the head — dummy lets us delete it uniformly.

---

## Q9. Convert Sorted List to Array (Length / Traversal Drills)

```js
function length(head) {
  let n = 0;
  while (head) { n++; head = head.next; }
  return n;
}

function toArray(head) {
  const a = [];
  while (head) { a.push(head.val); head = head.next; }
  return a;
}

function fromArray(values) {
  const dummy = new ListNode();
  let tail = dummy;
  for (const v of values) { tail.next = new ListNode(v); tail = tail.next; }
  return dummy.next;
}
```

These are foundational — every interview test harness uses them.

---

## Q10. Linked List Cycle II — Find Cycle Start

> Return the node where the cycle begins, or `null`.

```js
function detectCycle(head) {
  let slow = head, fast = head;
  while (fast && fast.next) {
    slow = slow.next;
    fast = fast.next.next;
    if (slow === fast) {
      let p = head;
      while (p !== slow) { p = p.next; slow = slow.next; }
      return p;
    }
  }
  return null;
}
```

- **Time**: O(n) · **Space**: O(1)
- **Math (worth memorizing)**: head→entrance is `a`, entrance→meet is `b`, meet→entrance going forward is `c`. From `2(a + b) = a + b + n(b + c)` we get `a = c + (n−1)(b + c)`. So walking `a` from head and `c` from meeting both arrive at the entrance.

---

## Q11. Remove Nth Node From End

> Remove the n-th node from the end. Return new head. **One pass.**

**Example**: `1→2→3→4→5, n=2` → `1→2→3→5`

```js
function removeNthFromEnd(head, n) {
  const dummy = new ListNode(0, head);
  let fast = dummy, slow = dummy;
  for (let i = 0; i < n; i++) fast = fast.next;
  while (fast.next) { fast = fast.next; slow = slow.next; }
  slow.next = slow.next.next;
  return dummy.next;
}
```

- **Time**: O(n) · **Space**: O(1)
- **Trick**: dummy + gap of n between fast and slow → when fast hits the last node, slow points to the one *before* the target.
- **Pitfall**: If you start `fast = head` instead of `dummy`, removing the first node breaks (n equals length).

---

## Q12. Convert Binary Number in a Linked List to Integer

> List of 1/0 bits, MSB first. Return decimal value.

**Example**: `1→0→1` → `5`

```js
function getDecimalValue(head) {
  let n = 0;
  while (head) { n = (n << 1) | head.val; head = head.next; }
  return n;
}
```

- **Time**: O(n) · **Space**: O(1)
- **Trick**: bit-shift accumulates digits without knowing length up front.

---

## Q13. Merge In Between Linked Lists (Easy-Medium boundary)

> Given `list1` and indices `a, b`, replace nodes from `a` to `b` (inclusive) with `list2`.

```js
function mergeInBetween(list1, a, b, list2) {
  let before = list1;
  for (let i = 0; i < a - 1; i++) before = before.next;
  let after = before;
  for (let i = 0; i < b - a + 2; i++) after = after.next;
  before.next = list2;
  let tail = list2;
  while (tail.next) tail = tail.next;
  tail.next = after;
  return list1;
}
```

- **Time**: O(n + m) · **Space**: O(1)

---

## Patterns Cheatsheet (Easy)

| Pattern               | Trigger                                                       | Examples here                |
| --------------------- | ------------------------------------------------------------- | ---------------------------- |
| **Dummy node**        | Head can change (insert/delete at head)                       | Q4, Q8, Q11                  |
| **Two pointers (1×/2×)** | Find middle, detect cycle                                  | Q2, Q3, Q6, Q10              |
| **Two pointers (k apart)** | Nth from end                                             | Q11                          |
| **Two pointers (two heads)** | Length-equalize across two lists                       | Q7                           |
| **3-pointer reversal** | In-place reversal                                            | Q1, Q6 (step 2)              |
| **Cache `next` first** | Any algorithm that overwrites `curr.next`                    | Q1                           |

---

## Common Interviewer Follow-Ups

1. *"Can you do it in one pass?"* — usually means slow/fast pointers.
2. *"Can you do it with O(1) space?"* — usually means in-place reversal or two pointers.
3. *"What if the list is doubly linked?"* — palindrome check becomes two-pointer-from-ends, O(n) time / O(1) space, no reversal needed.
4. *"What if the list is circular?"* — terminate on `head` instead of `null`; record start node.
5. *"What if there are duplicates / negatives / zero / single node / empty?"* — say each test case out loud.
