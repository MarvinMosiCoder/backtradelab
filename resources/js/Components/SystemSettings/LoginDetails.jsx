import axios from 'axios';

const LoginDetails = async () => {
    try {
        const response = await axios.get('/login-details');
        if(response.data){
            return {
                      login_bg_color : response.data.login_bg_color,
                      login_bg_image : response.data.login_bg_image,
                      login_font_color : response.data.login_font_color
                   };
        }
    } catch (error) {
        console.error('Error fetching app name:', error);
    }
};

export default LoginDetails;