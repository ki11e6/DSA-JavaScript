//! HashSet — Set of unique values backed by chaining
//* Like HashTable but stores values only, not key-value pairs.
//* Average O(1) for add/has/delete.
//* Resizes (doubles bucket count) when load factor > 0.75.

class HashSet {
    constructor(size = 7) {
        this.buckets = new Array(size);
        this.size = 0;
    }

    _hash(value) {
        let hash = 0;
        const s = String(value);
        for (let i = 0; i < s.length; i++) {
            hash = (hash + s.charCodeAt(i) * 23) % this.buckets.length;
        }
        return hash;
    }

    //* add a value; no-op if already present
    add(value) {
        const index = this._hash(value);
        if (!this.buckets[index]) this.buckets[index] = [];

        const bucket = this.buckets[index];
        for (let i = 0; i < bucket.length; i++) {
            if (bucket[i] === value) return this;
        }
        bucket.push(value);
        this.size++;

        if (this.size / this.buckets.length > 0.75) this._resize();
        return this;
    }

    has(value) {
        const index = this._hash(value);
        const bucket = this.buckets[index];
        if (!bucket) return false;
        for (let i = 0; i < bucket.length; i++) {
            if (bucket[i] === value) return true;
        }
        return false;
    }

    delete(value) {
        const index = this._hash(value);
        const bucket = this.buckets[index];
        if (!bucket) return false;
        for (let i = 0; i < bucket.length; i++) {
            if (bucket[i] === value) {
                bucket.splice(i, 1);
                this.size--;
                return true;
            }
        }
        return false;
    }

    values() {
        const out = [];
        for (let i = 0; i < this.buckets.length; i++) {
            const bucket = this.buckets[i];
            if (!bucket) continue;
            for (let j = 0; j < bucket.length; j++) out.push(bucket[j]);
        }
        return out;
    }

    _resize() {
        const oldBuckets = this.buckets;
        this.buckets = new Array(oldBuckets.length * 2);
        this.size = 0;
        for (let i = 0; i < oldBuckets.length; i++) {
            const bucket = oldBuckets[i];
            if (!bucket) continue;
            for (let j = 0; j < bucket.length; j++) this.add(bucket[j]);
        }
    }

    print() {
        console.log(this.values());
    }
}

// const s = new HashSet();
// s.add('apple').add('banana').add('apple');
// console.log(s.has('apple'));   // true
// console.log(s.has('cherry'));  // false
// console.log(s.size);           // 2 — duplicate add was a no-op
// console.log(s.values());       // ['apple', 'banana']

module.exports = HashSet;
