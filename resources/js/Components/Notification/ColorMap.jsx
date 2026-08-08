 // Map of initials to background color classes. Every entry must be a real, visible
 // pastel color — never blank and never white/near-white, since initials badges render
 // dark text on top of these (see getInitials usages) and a blank/white entry used to
 // silently fall back to the page theme class, producing invisible white-on-white text.
 const colorMap = {
    A: 'bg-amber-300',
    B: 'bg-blue-300',
    C: 'bg-cyan-300',
    D: 'bg-rose-300',
    E: 'bg-emerald-300',
    F: 'bg-fuchsia-300',
    G: 'bg-green-300',
    H: 'bg-pink-300',
    I: 'bg-indigo-300',
    J: 'bg-lime-300',
    K: 'bg-amber-400',
    L: 'bg-lime-400',
    M: 'bg-rose-400',
    N: 'bg-neutral-300',
    O: 'bg-orange-300',
    P: 'bg-purple-300',
    Q: 'bg-sky-400',
    R: 'bg-red-300',
    S: 'bg-sky-300',
    T: 'bg-teal-300',
    U: 'bg-violet-400',
    V: 'bg-violet-300',
    W: 'bg-slate-300',
    X: 'bg-slate-400',
    Y: 'bg-yellow-300',
    Z: 'bg-zinc-300'
};

export default colorMap;
