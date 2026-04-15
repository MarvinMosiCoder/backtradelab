import React, { useState, useEffect, useContext } from 'react';
import { useToast } from '../../Context/ToastContext';
import { useTheme } from '../../Context/ThemeContext';
import Button from '../../Components/Table/Buttons/Button';
import { Head } from '@inertiajs/react';
import { NavbarContext } from '../../Context/NavbarContext';
import InputComponent from '../../Components/Forms/Input';
import ContentPanel from '../../Components/Table/ContentPanel';
import WyswygTextEditor from '../../Components/Forms/WyswygTextEditor';
import axios from 'axios';
import DropdownSelect from '../../Components/Dropdown/Dropdown';
import Status from './Status';
import useThemeStyles from '../../Hooks/useThemeStyles';
const AnnouncementForm = ({ announcement, page_title, action }) => {
    const {theme} = useTheme();
    const { setTitle } = useContext(NavbarContext);
    const [loading, setLoading] = useState(false);
    const { handleToast } = useToast();
    const [errors, setErrors] = useState({});
    const selectedStatusOption = Status.find(option => option.id === announcement?.status);
    const [forms, setforms] = useState({
        a_id: announcement?.id || '',
        title: announcement?.title || '',
        message: announcement?.message || '',
        status: announcement?.status || '',
    });
    const { textColor, primayActiveColor } = useThemeStyles(theme);

    useEffect(() => {
        setTimeout(()=>{
            setTitle(page_title);
        });
    }, [page_title]);

    useEffect(() => {
        // If in edit mode, set initial values for preview
        if (announcement?.message) {
            handleChange({ target: { name: 'message', value: announcement.message } });
        }
    }, [announcement]);

    function handleChange(e) {
        const key = e.name ? e.name : e.target.name;
        const value = e.value ? e.value : e.target.value;
        setforms((forms) => ({
            ...forms,
            [key]: value,
        }));
        setErrors((prevErrors) => ({ ...prevErrors, [key]: '' }));
    }

    const validate = () => {
        const newErrors = {};
        if (!forms.title) newErrors.title = 'Title is required';
        if (!forms.message) {
            newErrors.message = 'Message is required';
        }
        return newErrors;
    };

    const handleSubmit = async (e, action) => {
        e.preventDefault();
        console.log(action)
        const newErrors = validate();
        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
        } else {
            setLoading(true);
            if(action == 'Add'){
                try {
                    const response = await axios.post('announcement/SaveAnnouncement', forms, {
                        headers: {
                            'Content-Type': 'multipart/form-data',
                        },
                    });
            
                    if (response.data.type == 'success') {
                        handleToast(response.data.message, response.data.status);
                    } else {
                        handleToast(response.data.message, response.data.status);
                    }
                } catch (error) {
                    if (error.response && error.response.status === 422) {
                        setErrors(error.response.data.errors);
                    } else {
                        setErrors({
                            general: 'An error occurred. Please try again.',
                        });
                    }
                } finally {
                    setLoading(false);
                }
            }else{
                try {
                    const response = await axios.post('/saveEditAnnouncement', forms, {
                        headers: {
                            'Content-Type': 'multipart/form-data',
                        },
                    });
            
                    if (response.data.type == 'success') {
                        handleToast(response.data.message, response.data.status);
                    } else {
                        handleToast(response.data.message, response.data.status);
                    }
                } catch (error) {
                    if (error.response && error.response.status === 422) {
                        setErrors(error.response.data.errors);
                    } else {
                        setErrors({
                            general: 'An error occurred. Please try again.',
                        });
                    }
                } finally {
                    setLoading(false);
                }
            }
        }
    };
    return (
        <>
            <Head title={page_title} />
            <ContentPanel>
                <form onSubmit={(e) => handleSubmit(e, action)} className="p-2">
                    <div className="flex flex-col mb-3 w-full">
                        <InputComponent
                            name="title"
                            value={forms.title}
                            onChange={handleChange}
                        />
                        {(errors.title) && (
                            <div className="font-poppins font-bold text-red-600">
                                {errors.title}
                            </div>
                        )}
                    </div>
                    <div className="flex flex-col mb-3 w-full">
                        <WyswygTextEditor name="message" value={forms.message} onChange={handleChange} error={errors.message} action={action}/>
                    </div>
                    <div className="flex flex-col mb-3 w-full">
                        {action === 'Edit' 
                        ?   
                        <DropdownSelect
                            selectType="select2"
                            displayName="Select a Status"
                            name="status"
                            options={Status}
                            value={{label:selectedStatusOption.name, value:selectedStatusOption.id}}
                            onChange={handleChange}
                        />
                        : ''
                        }
                    </div>
                    <Button
                        type="button"
                        extendClass={(theme === 'bg-skin-white' ? primayActiveColor : theme)+" block w-full mt-5"}
                        disabled={loading}
                        fontColor={theme === 'bg-skin-white' ? 'text-white' : textColor}
                    >
                       {
                        action == 'Add' 
                        ?
                        loading ? "Saving..." : "Save"
                        :
                        loading ? "Updating..." : "Update"
                       }
                    </Button>
                         
                </form>
            </ContentPanel>
        </>
    );
};

export default AnnouncementForm;