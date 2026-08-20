import { useEffect } from "react";
import NProgress from "nprogress";
import { router } from "@inertiajs/react";

const AppInitializer = () => {
    useEffect(() => {
        NProgress.configure({
            showSpinner: false,
            minimum: 0.15,
            speed: 300,
            trickleSpeed: 100,
        });

        // NProgress defaults to attaching its bar to <body> and positions it
        // fixed to the viewport top, so this works the same on every page
        // (dashboard, public, auth) with no per-layout wiring needed.
        const unlistenStart = router.on("start", () => {
            NProgress.start();
        });

        const unlistenFinish = router.on("finish", (event) => {
            if (
                event.detail.visit.completed ||
                event.detail.visit.interrupted ||
                event.detail.visit.cancelled
            ) {
                NProgress.done();
            }
        });

        return () => {
            unlistenStart();
            unlistenFinish();
        };
    }, []);

    return null; // Initialization logic only; no UI rendering
};

export default AppInitializer;
