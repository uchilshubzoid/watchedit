let _pending = null;
export function setPendingToast(t) { _pending = t; }
export function consumePendingToast() { const t = _pending; _pending = null; return t; }
