//! Trie (Prefix Tree)
//* Tree where each path from root to a marked node spells a word.
//* O(L) per insert / search / startsWith — L = length of word/prefix.
//* Memory cost ~ Σ unique-prefix-chars across all words (much less than n × L).
//* Used for: autocomplete, spellcheck, IP routing, longest-common-prefix queries.

class TrieNode {
    constructor() {
        this.end = false;
        this.children = {};      // char → TrieNode
    }
}

class Trie {
    constructor() {
        this.root = new TrieNode();
    }

    //* O(L)
    insert(word) {
        let node = this.root;
        for (const c of word) {
            if (!node.children[c]) node.children[c] = new TrieNode();
            node = node.children[c];
        }
        node.end = true;
    }

    //* O(L) — return true only if `word` was inserted as a complete word
    search(word) {
        const node = this._traverse(word);
        return !!node && node.end;
    }

    //* O(L) — return true if any inserted word starts with `prefix`
    startsWith(prefix) {
        return this._traverse(prefix) !== null;
    }

    _traverse(s) {
        let node = this.root;
        for (const c of s) {
            if (!node.children[c]) return null;
            node = node.children[c];
        }
        return node;
    }

    //! O(N) where N = total chars across all stored words
    delete(word) {
        return this._deleteRec(this.root, word, 0);
    }

    //* return true if the parent should free the slot for this child
    _deleteRec(node, word, i) {
        if (i === word.length) {
            if (!node.end) return false;
            node.end = false;
            return Object.keys(node.children).length === 0;
        }
        const c = word[i];
        if (!node.children[c]) return false;
        const shouldFree = this._deleteRec(node.children[c], word, i + 1);
        if (shouldFree) {
            delete node.children[c];
            return !node.end && Object.keys(node.children).length === 0;
        }
        return false;
    }

    //* return all stored words sharing the given prefix
    wordsWithPrefix(prefix) {
        const node = this._traverse(prefix);
        const out = [];
        if (!node) return out;
        const dfs = (n, path) => {
            if (n.end) out.push(path);
            for (const c in n.children) dfs(n.children[c], path + c);
        };
        dfs(node, prefix);
        return out;
    }
}

// const t = new Trie();
// t.insert('apple'); t.insert('app'); t.insert('apply');
// console.log(t.search('apple'));        // true
// console.log(t.search('appl'));         // false
// console.log(t.startsWith('appl'));     // true
// console.log(t.wordsWithPrefix('app')); // ['apple', 'app', 'apply'] (any order)
// t.delete('apple');
// console.log(t.search('apple'));        // false
// console.log(t.search('apply'));        // true — siblings preserved

module.exports = { TrieNode, Trie };
