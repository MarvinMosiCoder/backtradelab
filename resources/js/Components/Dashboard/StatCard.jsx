import { Link } from '@inertiajs/react';
import React, { useEffect, useRef, useState } from 'react';

const StatCard = ({ value, label, sublabel, icon, gradient, href, total, view }) => {
    const [count, setCount] = useState(0);
    const countingFinished = useRef(false);

    useEffect(() => {
        if (countingFinished.current) return;
        const duration = 500;
        const steps = 60;
        const stepValue = value / steps;
        let current = 0;
        
        const timer = setInterval(() => {
            current += stepValue;
            if (current >= value) {
                setCount(value);
                clearInterval(timer);
                countingFinished.current = true;
            } else {
                setCount(Math.floor(current));
            }
        }, duration / steps);
    
        return () => clearInterval(timer);
    }, [value]);

    const progress = total > 0 ? (count / total) * 100 : 0;

    return (
        <div style={{background: gradient}} className={`relative select-none overflow-hidden p-5 rounded-xl shadow-lg hover:scale-[1.02] transition-all duration-300 group`}>
            {/* Floating orbs */}
            <div className="absolute -top-4 -right-4 w-24 h-24 bg-white/10 rounded-full blur-3xl group-hover:bg-white/20 transition-all duration-300" />
            <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-white/10 rounded-full blur-3xl group-hover:bg-white/20 transition-all duration-300" />
            
            {/* Content */}
            <div className="relative flex flex-col h-full">
                <div className='flex'>
                    <div className="flex-1 mb-1">
                        <div className="font-bold text-xl md:text-2xl text-white tracking-tight">
                            {count.toLocaleString()}
                        </div>
                        <div className="text-md text-white/90 font-medium">
                            {label}
                        </div>
                        <div className="text-xs text-white/60">
                            {sublabel}
                        </div>
                    </div>
                    {
                        view && 
                        (
                            <Link className="flex items-center gap-2 text-white/60 text-xs font-medium" href={href}>
                                <div className="h-1 w-12 rounded-full bg-white/20 overflow-hidden relative">
                                    <div
                                        className="h-full bg-white/40 rounded-full transition-[width] duration-[2s] ease-out"
                                        style={{ width: `${progress}%` }} // Animated progress bar
                                    />
                                </div>
                                View Details
                            </Link>
                        )
                    }
                    <div className="text-white/80 text-[45px]" dangerouslySetInnerHTML={{ __html: icon }} />
                </div>
               
            </div>
        </div>
    );
};

export default StatCard;
