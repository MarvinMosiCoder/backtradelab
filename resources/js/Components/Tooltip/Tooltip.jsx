import React, { useState } from 'react';
import { useTheme } from '../../Context/ThemeContext';
import useThemeStyles from '../../Hooks/useThemeStyles';

const Tooltip = ({ children, text, extendClass, arrow = 'left' }) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const { theme } = useTheme();

  const convertText = (input) => {
    return input
      .replace(/^bg-/, '')
      .split('-')
      .map((word) => word.charAt(0) + word.slice(1))
      .join('-');
  };

  const { tooltipColor, arrwoTooltipColor } = useThemeStyles(convertText(theme));
  const { textColor } = useThemeStyles(theme);

  const arrowPositionStyles = {
    top: {
      tooltip: 'bottom-full left-1/2 transform -translate-x-1/2',
      arrow: 'top-full left-1/2 transform -translate-x-1/2',
      arrowStyles: {
        borderLeft: '5px solid transparent',
        borderRight: '5px solid transparent',
        borderTop: `5px solid ${arrwoTooltipColor}`,
      },
    },
    bottom: {
      tooltip: 'top-full left-1/2 transform -translate-x-1/2',
      arrow: 'bottom-full left-1/2 transform -translate-x-1/2',
      arrowStyles: {
        borderLeft: '5px solid transparent',
        borderRight: '5px solid transparent',
        borderBottom: `5px solid ${arrwoTooltipColor}`,
      },
    },
    left: {
      tooltip: 'right-full top-1/2 transform -translate-y-1/2',
      arrow: 'left-full top-1/2 transform -translate-y-1/2',
      arrowStyles: {
        borderTop: '5px solid transparent',
        borderBottom: '5px solid transparent',
        borderLeft: `5px solid ${arrwoTooltipColor}`,
      },
    },
    right: {
      tooltip: 'left-full top-1/2 transform -translate-y-1/2',
      arrow: 'right-full top-1/2 transform -translate-y-1/2',
      arrowStyles: {
        borderTop: '5px solid transparent',
        borderBottom: '5px solid transparent',
        borderRight: `5px solid ${arrwoTooltipColor}`,
      },
    },
  };

  const currentArrowPosition = arrowPositionStyles[arrow] || arrowPositionStyles.left;

  return (
    <>
      {text ? (
        <div
          className={`relative ${text ? 'flex items-center' : ''}`}
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
          style={{ overflow: 'visible', zIndex: 60 }}
        >
          {children}
          {showTooltip && (
            <div
              className={`absolute ${currentArrowPosition.tooltip} ${extendClass} w-max px-2 py-[2px] ${textColor} ${tooltipColor} rounded shadow-lg text-sm`}
              style={{ overflow: 'visible', zIndex: 60 }}
            >
              <div
                className={`absolute ${currentArrowPosition.arrow}`}
                style={currentArrowPosition.arrowStyles}
              ></div>
              {text}
            </div>
          )}
        </div>
      ) : (
        <div
          className={`relative ${text ? 'flex items-center' : ''} w-full`}
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
          style={{ overflow: 'visible', zIndex: 60 }}
        >
          {children}
        </div>
      )}
    </>
  );
};

export default Tooltip;