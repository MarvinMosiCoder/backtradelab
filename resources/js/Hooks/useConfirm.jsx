import { useCallback, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Trash2 } from 'lucide-react';
import { useTheme } from '../Context/ThemeContext';

/**
 * Drop-in async replacement for window.confirm(), styled to match this app's
 * dark-terminal theme (see the delete-watchlist modal in WatchlistContext.jsx,
 * which this mirrors) instead of the browser's native "site says" dialog.
 *
 * const { confirm, confirmElement } = useConfirm();
 * const ok = await confirm('Remove BTCU from your saved symbols?', { title: 'Remove saved symbol?', confirmLabel: 'Remove' });
 * if (!ok) return;
 * ...
 * return <>{jsx}{confirmElement}</>;
 */
export function useConfirm() {
    const { theme } = useTheme();
    const isDark = theme === 'bg-skin-black';
    const [state, setState] = useState(null);
    const resolveRef = useRef(null);

    const confirm = useCallback((message, options = {}) => {
        return new Promise((resolve) => {
            resolveRef.current = resolve;
            setState({
                message,
                title: options.title ?? 'Are you sure?',
                confirmLabel: options.confirmLabel ?? 'Confirm',
                cancelLabel: options.cancelLabel ?? 'Cancel',
            });
        });
    }, []);

    const settle = (result) => {
        resolveRef.current?.(result);
        resolveRef.current = null;
        setState(null);
    };

    const confirmElement = state && typeof document !== 'undefined' ? createPortal(
        <div
            className="fixed inset-0 z-[10021] flex items-end justify-center bg-black/70 p-4 backdrop-blur-sm sm:items-center"
            onMouseDown={(event) => event.target === event.currentTarget && settle(false)}
        >
            <div className={`w-full max-w-sm rounded-2xl border p-5 shadow-2xl ${isDark ? 'border-[#2a2e39] bg-[#131722] text-white' : 'border-slate-200 bg-white text-slate-900'}`}>
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-red-500/10 text-red-500">
                    <Trash2 size={18} />
                </span>
                <h2 className="mt-4 text-lg font-bold">{state.title}</h2>
                <p className="mt-2 text-xs leading-5 text-[#787b86]">{state.message}</p>
                <div className="mt-5 flex justify-end gap-2">
                    <button
                        type="button"
                        onClick={() => settle(false)}
                        className={`h-10 rounded-lg border px-4 text-xs font-semibold ${isDark ? 'border-[#2a2e39] hover:bg-white/5' : 'border-slate-200 hover:bg-slate-50'}`}
                    >
                        {state.cancelLabel}
                    </button>
                    <button
                        type="button"
                        onClick={() => settle(true)}
                        className="h-10 rounded-lg bg-red-600 px-4 text-xs font-bold text-white hover:bg-red-700"
                        autoFocus
                    >
                        {state.confirmLabel}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    ) : null;

    return { confirm, confirmElement };
}
