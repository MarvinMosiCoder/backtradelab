import React, { createContext, useContext, useState, useEffect } from 'react';

// Create a context for the theme
const ThemeContext = createContext();
// Create a context for the profile
const ProfileContext = createContext();

// Custom hook to use the theme context
export const useTheme = () => {
    return useContext(ThemeContext);
};

// Custom hook to use the profile context
export const useProfile = () => {
    return useContext(ProfileContext);
}
    

// Function to get the theme class based on the theme color
const getThemeClass = (themeColor) => {
    switch (themeColor) {
        case 'skin-green':
            return 'bg-skin-green';
        case 'skin-green-light':
            return 'bg-skin-green-light';
        case 'skin-blue':
            return 'bg-skin-blue';
        case 'skin-blue-light':
            return 'bg-skin-blue-light';
        case 'skin-yellow':
            return 'bg-skin-yellow';
        case 'skin-yellow-light':
            return 'bg-skin-yellow-light';
        case 'skin-purple':
            return 'bg-skin-purple';
        case 'skin-purple-light':
            return 'bg-skin-purple-light';
        case 'skin-red':
            return 'bg-skin-red';
        case 'skin-red-light':
            return 'bg-skin-red-light';
        case 'skin-black':
            return 'bg-skin-black';
        case 'skin-black-light':
            return 'bg-skin-black-light';
        case 'skin-white':
            return 'bg-skin-white';
        default:
            return 'default';
    }
};

// Create a provider component
export const ThemeProvider = ({ children, themeColor, profileData }) => {
    const [theme, setTheme] = useState('');
    const [profile, setProfile] = useState(profileData || null);

    useEffect(() => {
        setTheme(getThemeClass(themeColor));
    }, [themeColor]);

    return (
        <ThemeContext.Provider value={{theme, setTheme}}>
           <ProfileContext.Provider value={{ profile, setProfile }}>
                {children}
            </ProfileContext.Provider>
        </ThemeContext.Provider>
    );
};