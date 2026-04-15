import axios from 'axios';

const getAppName = async () => {
    try {
        const response = await axios.get('/appname');
        if(response.data.app_name){
            return response.data.app_name;
        }else{
            return 'VRAM';
        }
    } catch (error) {
        console.error('Error fetching app name:', error);
        return 'VRAM';
    }
};

export default getAppName;