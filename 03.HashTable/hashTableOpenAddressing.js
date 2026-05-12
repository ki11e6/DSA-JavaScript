//! HashTable — Open Addressing (Linear Probing)
//* All entries live directly in the bucket array — no chained lists.
//* On collision, probe the next index linearly until an empty slot is found.
//* Deletion uses a TOMBSTONE sentinel so the probe sequence isn't broken for other keys.
//* Cache-friendly (one allocation), but load factor must stay < ~0.7 to keep probes short.
//* Average O(1) for set/get/has/delete; degrades quickly past 0.7 load factor.

const TOMBSTONE = Symbol('TOMBSTONE');

class HashTableOA {
    constructor(size = 8) {
        this.keysArr = new Array(size).fill(null);
        this.valsArr = new Array(size).fill(null);
        this.length = 0;
    }

    _hash(key) {
        let hash = 0;
        const s = String(key);
        for (let i = 0; i < s.length; i++) {
            hash = (hash * 31 + s.charCodeAt(i)) | 0;
        }
        return Math.abs(hash) % this.keysArr.length;
    }

    //* find the slot for `key`: either the slot already holding it, or
    //* the first empty/tombstone slot we can reuse for inserting it
    _findSlot(key) {
        let i = this._hash(key);
        let firstReusable = -1;
        const n = this.keysArr.length;
        for (let probe = 0; probe < n; probe++) {
            const slotKey = this.keysArr[i];
            if (slotKey === null) {
                return firstReusable !== -1 ? firstReusable : i;
            }
            if (slotKey === TOMBSTONE) {
                if (firstReusable === -1) firstReusable = i;
            } else if (slotKey === key) {
                return i;
            }
            i = (i + 1) % n;
        }
        return firstReusable;
    }

    set(key, value) {
        if ((this.length + 1) / this.keysArr.length > 0.7) this._resize();

        const i = this._findSlot(key);
        if (this.keysArr[i] !== key) this.length++;
        this.keysArr[i] = key;
        this.valsArr[i] = value;
        return this;
    }

    get(key) {
        let i = this._hash(key);
        const n = this.keysArr.length;
        for (let probe = 0; probe < n; probe++) {
            const slotKey = this.keysArr[i];
            if (slotKey === null) return undefined;
            if (slotKey === key) return this.valsArr[i];
            i = (i + 1) % n;
        }
        return undefined;
    }

    has(key) {
        return this.get(key) !== undefined || this._slotOf(key) !== -1;
    }

    //* internal: returns slot index of `key` or -1 if not present
    _slotOf(key) {
        let i = this._hash(key);
        const n = this.keysArr.length;
        for (let probe = 0; probe < n; probe++) {
            const slotKey = this.keysArr[i];
            if (slotKey === null) return -1;
            if (slotKey === key) return i;
            i = (i + 1) % n;
        }
        return -1;
    }

    delete(key) {
        const i = this._slotOf(key);
        if (i === -1) return false;
        this.keysArr[i] = TOMBSTONE;
        this.valsArr[i] = null;
        this.length--;
        return true;
    }

    keys() {
        const out = [];
        for (let i = 0; i < this.keysArr.length; i++) {
            const k = this.keysArr[i];
            if (k !== null && k !== TOMBSTONE) out.push(k);
        }
        return out;
    }

    values() {
        const out = [];
        for (let i = 0; i < this.keysArr.length; i++) {
            const k = this.keysArr[i];
            if (k !== null && k !== TOMBSTONE) out.push(this.valsArr[i]);
        }
        return out;
    }

    entries() {
        const out = [];
        for (let i = 0; i < this.keysArr.length; i++) {
            const k = this.keysArr[i];
            if (k !== null && k !== TOMBSTONE) out.push([k, this.valsArr[i]]);
        }
        return out;
    }

    //! double size and rehash all live entries; tombstones disappear
    _resize() {
        const oldK = this.keysArr;
        const oldV = this.valsArr;
        this.keysArr = new Array(oldK.length * 2).fill(null);
        this.valsArr = new Array(oldK.length * 2).fill(null);
        this.length = 0;
        for (let i = 0; i < oldK.length; i++) {
            if (oldK[i] !== null && oldK[i] !== TOMBSTONE) this.set(oldK[i], oldV[i]);
        }
    }

    print() {
        for (let i = 0; i < this.keysArr.length; i++) {
            const k = this.keysArr[i];
            const label = k === null ? '<empty>' : k === TOMBSTONE ? '<tombstone>' : k;
            console.log(i, label, this.valsArr[i]);
        }
    }
}

// const ht = new HashTableOA();
// ht.set('a', 1).set('b', 2).set('c', 3);
// console.log(ht.get('b'));      // 2
// ht.delete('b');
// console.log(ht.get('b'));      // undefined
// console.log(ht.get('c'));      // 3 — probe survives across the tombstone
// console.log(ht.keys());        // ['a', 'c']

module.exports = HashTableOA;
