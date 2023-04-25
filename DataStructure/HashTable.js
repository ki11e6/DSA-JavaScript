//!Separate Chaining
//*In the collision, the process of putting arrays in same address space is called Separate Chaining.
//!Linear Probing
//*If its Open addressing then Linear Probing is used so when there is already an array in on address next address will be allocated if not occupied.
//*Size= 7 is the default value if not specified
//!hash function is BigO(1). hash function is very efficient in randomizing positions so get method will be BigO(1) instead of O(n)

class HashTable {
    constructor(size = 7) {
        this.dataMap = new Array(size);
    }
    _hash(key) {
        let hash = 0;
        for (let i = 0; i < key.length; i++) {
            //charCodeAt will give give utf-16 0-65535
            hash = (hash + key.charCodeAt(i) * 23) % this.dataMap.length;
        }
        return hash;
    }
    set(key, value) {
        let index = this._hash(key);
        if (!this.dataMap[index]) {
            this.dataMap[index] = [];
        }
        this.dataMap[index].push([key, value]);
        return this;
    }
    get(key) {
        let index = this._hash(key);
        if (this.dataMap[index]) {
            for (let i = 0; i < this.dataMap[index].length; i++) {
                if (this.dataMap[index][i][0] === key) {
                    return this.dataMap[index][i][1];
                }
            }
        }
        return undefined;
    }
    keys() {
        let allKeys = [];
        for (let i = 0; i < this.dataMap.length; i++) {
            if (this.dataMap[i]) {
                for (let j = 0; j < this.dataMap[i].length; j++) {
                    allKeys.push(this.dataMap[i][j][0]);
                }
            }
        }
        return allKeys;
    }
}

let newHashTable = new HashTable();
newHashTable.set('bolts', 1400);
newHashTable.set('washers', 50);
newHashTable.set('nails', 1220);
newHashTable.set('nuts', 1400);
console.log(newHashTable.keys());
