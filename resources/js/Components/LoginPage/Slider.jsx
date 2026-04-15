import React, { useState, useEffect } from "react";

const Slider = ({image}) => {
    const [currentSlide, setCurrentSlide] = useState(0);
    const slides = [
        <div 
            key={1}
            className="flex w-[636px] justify-center items-center h-lvh"
        >
            <p className="text-white font-poppins font-bold text-[20px]">
                VRAM Admin Template
            </p>
        </div>,
         <div
            key={2}
            className="flex w-[650px] justify-center items-center h-lvh bg-black"
        >
             <img
                src={image}
                className={`rounded-full bg-center  bg-no-repeat md:h-[350px]`}
             />
        </div>,
    ];

    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentSlide((prev) =>
                prev === slides.length - 1 ? 0 : prev + 1
            );
        }, 5000);

        return () => clearInterval(interval);
    }, [slides.length]);

    return (
        <div className="overflow-hidden">
            <div
                className="flex transition-transform duration-700 ease-in-out"
                style={{ transform: `translateX(-${currentSlide * 100}%)` }}
            >
                {slides.map((slide, index) => (
                    <div key={index}>
                        {slide}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default Slider;
