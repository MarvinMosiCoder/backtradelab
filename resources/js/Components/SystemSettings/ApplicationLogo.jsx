import axios from 'axios';

const getAppLogo = async () => {
    try {
        const response = await axios.get('/applogo');
        if(response.data.app_logo){
            return response.data.app_logo;
        }else{
            return '/images/settings/vram-logo/vram-logo.webp';
        }
    } catch (error) {
        console.error('Error fetching app name:', error);
        return '/images/settings/vram-logo/vram-logo.webp';
    }
};

export default getAppLogo;