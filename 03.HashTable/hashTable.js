//! HashTable — Separate Chaining
//* Each bucket holds a list of [key, value] pairs.
//* On collision, append to the bucket's list.
//* Average O(1) for set/get/has/delete; O(n) worst case if all keys collide.
//* Resizes (doubles bucket count) when load factor exceeds 0.75 to keep collisions low.

class HashTable {
    constructor(size = 7) {
        this.dataMap = new Array(size);
        this.length = 0;
    }

    //* polynomial rolling hash; * 23 is the prime multiplier
    _hash(key) {
        let hash = 0;
        const s = String(key);
        for (let i = 0; i < s.length; i++) {
            hash = (hash + s.charCodeAt(i) * 23) % this.dataMap.length;
        }
        return hash;
    }

    //* set a key-value pair; if key already exists, overwrite its value
    set(key, value) {
        const index = this._hash(key);
        if (!this.dataMap[index]) this.dataMap[index] = [];

        const bucket = this.dataMap[index];
        for (let i = 0; i < bucket.length; i++) {
            if (bucket[i][0] === key) {
                bucket[i][1] = value;
                return this;
            }
        }
        bucket.push([key, value]);
        this.length++;

        if (this.length / this.dataMap.length > 0.75) this._resize();
        return this;
    }

    //* return the value for key, or undefined if not present
    get(key) {
        const index = this._hash(key);
        const bucket = this.dataMap[index];
        if (!bucket) return undefined;
        for (let i = 0; i < bucket.length; i++) {
            if (bucket[i][0] === key) return bucket[i][1];
        }
        return undefined;
    }

    //* return true if key is in the table
    has(key) {
        const index = this._hash(key);
        const bucket = this.dataMap[index];
        if (!bucket) return false;
        for (let i = 0; i < bucket.length; i++) {
            if (bucket[i][0] === key) return true;
        }
        return false;
    }

    //* remove key; return true if removed, false if not present
    delete(key) {
        const index = this._hash(key);
        const bucket = this.dataMap[index];
        if (!bucket) return false;
        for (let i = 0; i < bucket.length; i++) {
            if (bucket[i][0] === key) {
                bucket.splice(i, 1);
                this.length--;
                return true;
            }
        }
        return false;
    }

    //* all keys, in no particular order
    keys() {
        const out = [];
        for (let i = 0; i < this.dataMap.length; i++) {
            const bucket = this.dataMap[i];
            if (!bucket) continue;
            for (let j = 0; j < bucket.length; j++) out.push(bucket[j][0]);
        }
        return out;
    }

    //* all values
    values() {
        const out = [];
        for (let i = 0; i < this.dataMap.length; i++) {
            const bucket = this.dataMap[i];
            if (!bucket) continue;
            for (let j = 0; j < bucket.length; j++) out.push(bucket[j][1]);
        }
        return out;
    }

    //* iterable of [key, value] pairs
    entries() {
        const out = [];
        for (let i = 0; i < this.dataMap.length; i++) {
            const bucket = this.dataMap[i];
            if (!bucket) continue;
            for (let j = 0; j < bucket.length; j++) out.push([bucket[j][0], bucket[j][1]]);
        }
        return out;
    }

    //! double bucket count and rehash; amortized O(1) per insert
    _resize() {
        const oldBuckets = this.dataMap;
        this.dataMap = new Array(oldBuckets.length * 2);
        this.length = 0;
        for (let i = 0; i < oldBuckets.length; i++) {
            const bucket = oldBuckets[i];
            if (!bucket) continue;
            for (let j = 0; j < bucket.length; j++) this.set(bucket[j][0], bucket[j][1]);
        }
    }

    print() {
        for (let i = 0; i < this.dataMap.length; i++) {
            console.log(i, this.dataMap[i] ?? null);
        }
    }
}

// const ht = new HashTable();
// ht.set('bolts', 1400);
// ht.set('washers', 50);
// ht.set('nails', 1220);
// ht.set('nuts', 1400);
// console.log(ht.keys());        // ['bolts', 'washers', 'nails', 'nuts']
// console.log(ht.get('nails'));  // 1220
// console.log(ht.has('screws')); // false
// ht.delete('washers');
// ht.print();

module.exports = HashTable;
