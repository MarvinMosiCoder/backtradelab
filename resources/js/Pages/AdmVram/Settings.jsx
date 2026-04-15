import React, { useState } from 'react'
import { Head, router } from '@inertiajs/react'
import InputComponent from '../../Components/Forms/Input'
import Card from '../../Components/Forms/Card'
import axios from 'axios';
import { useToast } from '../../Context/ToastContext';
import { useTheme } from '../../Context/ThemeContext';
import InputFile from '../../Components/Forms/InputFile';
import BreadCrumbs from '../../Components/Table/BreadCrumbs';

const Settings = ({app_name, favicon, logo, login_background_color, login_font_color, login_background_image}) => {
   
    const { theme } = useTheme();
    const { handleToast } = useToast();
    const [loading, setLoading] = useState(false);

    const [forms, setForms] = useState({
        app_name: app_name || '',
        favicon: '',
        login_background_color: login_background_color || '',
        login_font_color: login_font_color || ''
    });
    
    const handleChange = (e) => {
        const key = e.target.name;
        const value =  e.target.files?.[0] ?? e.target.value;
        setForms((forms) => ({
            ...forms,
            [key]: value,
        }));
    }

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const response = await axios.post('/settings/postSave', forms, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });
            if (response.data.type == 'success') {
                handleToast(response.data.message, response.data.status);
                router.reload({ only: ['settings'] });
            } else {
                handleToast(response.data.message, response.data.status);
            }
        } catch (error) {
            if (error.response && error.response.status === 422) {
                handleToast(error.response.data.errors, 'error');
            } else {
                handleToast('An error occurred. Please try again.', 'error');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (e,id) => {
        e.preventDefault();
        try {
            const response = await axios.post('/settings/postDelete', {id: id});
            if (response.data.type == 'success') {
                handleToast(response.data.message, response.data.status);
                router.reload({ only: ['settings'] });
            } else {
                handleToast(response.data.message, response.data.status);
            }
        } catch (error) {
            if (error.response && error.response.status === 422) {
                handleToast(error.response.data.errors, 'error');
            } else {
                handleToast('An error occurred. Please try again.', 'error');
            }
        }
    }

    return (
        <>
            <Head title='Settings'/>
            <div className="flex gap-1 flex-col sm:flex-row">
                <Card withButton="true" onClick={handleSubmit} loading={loading} theme={theme} headerName="Login Settings" marginBottom={4} iconClass="fa fa-cog" >
                    <form onSubmit={handleSubmit}>
                        <div className="mb-3 w-full">
                            <InputComponent 
                                name="login_background_color"       
                                value={forms.login_background_color}
                                onChange={handleChange}
                            >
                                Login Background Color
                            </InputComponent>
                            <span className="font-poppins text-sm italic">Please refer to the privilege theme color ex. bg-skin-blue</span>
                        </div>
                        <div className="mb-3 w-full">
                            <InputComponent 
                                name="login_font_color"       
                                value={forms.login_font_color}
                                onChange={handleChange}
                            >
                                Login Font Color 
                            </InputComponent>
                            <span className="font-poppins text-sm italic">Please refer to the privilege theme color ex. bg-skin-blue</span>
                        </div>
                        {login_background_image?.content 
                        ? 
                            <>
                                <span>Login background Image</span>
                                <div className="flex gap-1 justify-between mb-3 w-full">
                                    <span>
                                        <a className="text-blue-500" href={login_background_image.content} download={login_background_image.content}> <i className="fa fa-download"></i> Download the File of Login Background Image</a>
                                    </span>
                                    <a className="fa fa-trash text-red-600" onClick={(e)=>handleDelete(e,login_background_image.id)}></a>
                                </div>
                            </>
                            
                        :
                            <>
                                <div className="mb-3 w-full">
                                    <InputFile 
                                        name="login_background_image"
                                        onChange={handleChange}
                                        extendedClass={theme}
                                    >
                                        Login Background Image
                                    </InputFile>
                                </div>
                            </>
                        }
                    </form>
                </Card>
                <Card withButton="true" onClick={handleSubmit} loading={loading} theme={theme} headerName="Application Settings" marginBottom={4} iconClass="fa fa-cog" >
                    <form onSubmit={handleSubmit}>
                    <div className="mb-3 w-full">
                        <InputComponent 
                            name="app_name"       
                            value={forms.app_name}
                            onChange={handleChange}
                            displayName="Application Name"
                        >
                            Application Name
                        </InputComponent>
                    </div>
                        {favicon?.content
                        ? 
                            <>
                                <span>Favicon</span>
                                <div className="flex gap-1 justify-between mb-3 w-full">
                                    <span>
                                        <a className="text-blue-500" href={favicon.content} download={favicon.content}> <i className="fa fa-download"></i> Download the File of Favicon</a>
                                    </span>
                                    <a className="fa fa-trash text-red-600" onClick={(e)=>handleDelete(e,favicon.id)}></a>
                                </div>
                            </>
                            
                        :
                            <>
                                <div className="mb-3 w-full">
                                    <InputFile 
                                        name="favicon"
                                        onChange={handleChange}
                                        extendedClass={theme}
                                    >
                                        Favicon
                                    </InputFile>
                                </div>
                            </>
                        }
                        {logo?.content 
                        ? 
                            <>
                                <span>Logo</span>
                                <div className="flex gap-1 justify-between mb-3 w-full">
                                    <span>
                                        <a className="text-blue-500" href={logo.content} download={logo.content}> <i className="fa fa-download"></i> Download the File of Logo</a>
                                    </span>
                                    <a className="fa fa-trash text-red-600" onClick={(e)=>handleDelete(e,logo.id)}></a>
                                </div>
                            </>
                            
                        :
                        <>
                            <div className="mb-3 w-full">
                                <InputFile 
                                    name="system_logo"
                                    onChange={handleChange}
                                    extendedClass={theme}
                                >
                                    Logo
                                </InputFile>
                            </div>
                        </>
                        }
                    </form>
                </Card>
            </div>
        </>
    )
}

export default Settings