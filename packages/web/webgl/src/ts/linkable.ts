export class Linkable {

    _: number = 0;
    _references: any[] = []
    _refCount = 0
    _pendingDelete = false
    _binding = 0

    constructor(_: number ) {
        this._ = _
        this._references = []
        this._refCount = 0
        this._pendingDelete = false
        this._binding = 0
    }

    _link(b: any) {
        this._references.push(b)
        b._refCount += 1
        return true
    }

    _unlink(b: any) {
        let idx = this._references.indexOf(b)
        if (idx < 0) {
            return false
        }
        while (idx >= 0) {
            this._references[idx] = this._references[this._references.length - 1]
            this._references.pop()
            b._refCount -= 1
            b._checkDelete()
            idx = this._references.indexOf(b)
        }
        return true
    }

    _linked(b: any) {
        return this._references.indexOf(b) >= 0
    }

    _checkDelete() {
        if (this._refCount <= 0 &&
            this._pendingDelete &&
            this._ !== 0) {
            while (this._references.length > 0) {
                this._unlink(this._references[0])
            }
            this._performDelete()
            this._ = 0
        }
    }

    _performDelete() { }
}
