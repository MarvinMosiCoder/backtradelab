import { useState, useEffect } from 'react';

const useThemeSwalColor = (themeColor) => {
    const [swal, setSwal] = useState('');

    useEffect(() => {
        switch (themeColor) {
            case 'bg-skin-green':
                setSwal('#1A5319'); 
                break;
            case 'bg-skin-green-light':
                setSwal('#508D4E'); 
                break;
            case 'bg-skin-blue':
                setSwal('#134B70'); 
                break;
            case 'bg-skin-blue-light':
                setSwal('#508C9B'); 
                break;
            case 'bg-skin-yellow':
                setSwal('#F4CE14'); 
                break;
            case 'bg-skin-yellow-light':
                setSwal('#FFF455'); 
                break;
            case 'bg-skin-purple':
                setSwal('#BC5A94'); 
                break;
            case 'bg-skin-purple-light':
                setSwal('#F075AA'); 
                break;
            case 'bg-skin-red':
                setSwal('#C40C0C'); 
                break;
            case 'bg-skin-red-light':
                setSwal('#E72929'); 
                break;
            case 'bg-skin-black':
                setSwal('#31363F'); 
                break;
            case 'bg-skin-black-light':
                setSwal('#31363F'); 
                break;
            case 'bg-skin-white':
                setSwal('#3c8dbc'); 
                break;
            default:
                setSwal('bg-mobile-gradient'); 
        }
    }, [themeColor]);

    return swal;
};

export default useThemeSwalColor;