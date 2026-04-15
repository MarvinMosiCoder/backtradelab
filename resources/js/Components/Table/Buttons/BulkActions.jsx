import React, { useState, useRef, useEffect } from 'react';
import TableButton from './TableButton';
import { useTheme } from '../../../Context/ThemeContext';
import useThemeStyles from '../../../Hooks/useThemeStyles';
const BulkActions = ({ actions, onActionSelected, btnColor, fontColor }) => {
    const {theme} = useTheme();
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);
    const { textColor, hoverColor } = useThemeStyles(theme);

    const toggleDropdown = () => {
        setIsOpen((prevIsOpen) => !prevIsOpen); 
    };

    const handleButtonMouseDown = (event) => {
        event.stopPropagation();
    };
    
    const handleClickOutside = (event) => {
        if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
            setIsOpen(false);
        }
    };

    useEffect(() => {
        document.addEventListener('mousedown', handleClickOutside);

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const handleActionClick = (action) => {
        setIsOpen(false);
        if (onActionSelected) {
            onActionSelected(action);
        }
    };

    return (
        <div className="relative cursor-pointer">
            <TableButton extendClass={btnColor ?? theme+''} fontColor={fontColor ?? textColor} onClick={toggleDropdown} onMouseDown={handleButtonMouseDown}>
                <i className="fa fa-check-square px-1"></i> <span className='hidden md:inline-flex md:inline-flex'>Bulk Actions</span> 
            </TableButton>
            {isOpen && (
                <ul className="absolute top-full left-0 min-w-[200px] max-h-[200px] overflow-y-auto p-0 m-0 shadow-customLight z-[100] rounded-md" ref={dropdownRef}>
                    {actions.map((action, index) => (
                        <li 
                            key={index} 
                            onClick={() => handleActionClick(action.value)}
                            className={`px-4 py-2 cursor-pointer text-sm ${theme === 'bg-skin-black' ? theme+' text-gray-500' : 'bg-white'} hover:bg-gray-100`}
                        >
                            {action.label}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};

export default BulkActions;
