import { Head, Link, router, usePage } from '@inertiajs/react';
import React, { useContext, useEffect, useState } from 'react';
import AppContent from '../../Layouts/layout/AppContent';
import ContentPanel from '../../Components/Table/ContentPanel';
import InputComponent from '../../Components/Forms/Input';
import { NavbarContext } from '../../Context/NavbarContext';
import Select from '../../Components/Forms/Select';
import themeColor from './ThemeColor';
import Checkbox from '../../Components/Checkbox/Checkbox';
import TableButton from '../../Components/Table/Buttons/TableButton';
import axios from 'axios';
import RadioButton from '../../Components/Checkbox/RadioButton';
import DropdownSelect from '../../Components/Dropdown/Dropdown';
import { useToast } from '../../Context/ToastContext';
import { useTheme } from '../../Context/ThemeContext';
import Card from '../../Components/Forms/Card';
import useThemeStyles from '../../Hooks/useThemeStyles';

const PrivilegesForm = ({ moduleses, row }) => {

    const { setTitle } = useContext(NavbarContext);
    const { handleToast } = useToast();
    const [roles, setRoles] = useState({ is_superadmin: '0',});
    const [modules, setModules] = useState([]);
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState({});
    const [clearErrors, setClearErrors] = useState({});
    const [errorMessage, setErrorMessage] = useState("");
    const [showPriv, setShowPriv] = useState(true);
    const [selectAll, setSelectAll] = useState({
        is_visible: false,
        is_create: false,
        is_read: false,
        is_edit: false,
        is_delete: false,
        is_void: false,
        is_override: false
    });

    const {theme,setTheme} = useTheme();
    const { textColor, bgColor, hoverBgColor } = useThemeStyles(theme);
    const [forms, setForms] = useState({
        header_id: '',
        name:  '',
        is_superadmin: '',
        privileges: {},
        theme_color: '',
    });

    useEffect(() => {
        setTimeout(()=>{
            setTitle('Privilege Form');
        },5);
        setModules(moduleses);
        setRows(row);
        setForms(row);
        if(row.is_superadmin == 1){
            setShowPriv(false);
        }else{
            setShowPriv(true);
        }

    }, []);

    useEffect(()=>{
        setSelectAll((prevState) => ({
            ...prevState,
            is_visible: modules.every(item => item.roles?.is_visible == 1) ? 1 : 0,
            is_create: modules.every(item => item.roles?.is_create == 1) ? 1 : 0,
            is_read: modules.every(item => item.roles?.is_read == 1) ? 1 : 0,
            is_edit: modules.every(item => item.roles?.is_edit == 1) ? 1 : 0,
            is_delete: modules.every(item => item.roles?.is_delete == 1) ? 1 : 0,
            is_void: modules.every(item => item.roles?.is_void == 1) ? 1 : 0,
            is_override: modules.every(item => item.roles?.is_override == 1) ? 1 : 0
        }));
    },[modules]);
    
    const handleSelectAll = (e, permission) => {
        const { type, checked, value } = e.target;
        const actualValue = type === 'checkbox' ? (checked ? '1' : '') : value;
        setSelectAll((prevState) => ({
            ...prevState,
            [permission]: !prevState[permission],
        }));
        // Update roles state based on new select all state
        setModules(modules.map(modul => {
            return {
                ...modul,
                roles: {
                    ...modul.roles,
                    [permission]: checked,
                }
            };
            
        }));

        modules.map(item => {
            setForms(forms => ({
                ...forms,
                privileges: {
                    ...forms.privileges,
                    [item.id]: {
                        ...forms.privileges?.[item.id],
                        [permission]: actualValue,
                    },
                },
            }));
        });
    };

    const handleCheckboxChange = (e, moduleId, permission) => {
        const { name, value, type, checked } = e.target;
        const actualValue = type === 'checkbox' ? (checked ? '1' : '') : value;
        const nameParts = name.split(/[\[\]]/).filter(Boolean);
        if (nameParts.length === 3) {
            setForms({
                ...forms,
                privileges: {
                    ...forms.privileges,
                    [nameParts[1]]: {
                        ...forms.privileges?.[nameParts[1]],
                        [nameParts[2]]: actualValue,
                    },
                },
            });
        }

        setModules(modules.map(modul => {
            if (modul.id === moduleId) {
                return {
                    ...modul,
                    roles: {
                        ...modul.roles,
                        [permission]: checked
                    }
                };
            }
            return modul;
        }));
    };

    const handleSelectHorizontal = (e, moduleId) => {
        const { type, checked } = e.target;
        const actualValue = type === 'checkbox' ? (checked ? '1' : '0') : value;

        setModules(modules.map(modul => {
            if (modul.id === moduleId) {
                return {
                    ...modul,
                    roles: {
                        ...modul.roles,
                        is_visible: checked,
                        is_create: checked,
                        is_read: checked,
                        is_edit: checked,
                        is_delete: checked,
                        is_void: checked,
                        is_override: checked
                    }
                };
            }
            return modul;
        }));

        setForms({
            ...forms,
            privileges: {
                ...forms.privileges,
                [moduleId]: {
                    ...forms.privileges?.[moduleId],
                    is_visible: actualValue,
                    is_create: actualValue,
                    is_read: actualValue,
                    is_edit: actualValue,
                    is_delete: actualValue,
                    is_void: actualValue,
                    is_override: actualValue
                },
            },
        });
    };

    //INPUTS
    function handleInputChange(e) {
        const key =  e.name ? e.name : e.target.name;
        const value = e.value ? e.value : e.target.value;
        console.log(key,value);
        if(key == 'is_superadmin'){
            value == 1 ? setShowPriv(false) : setShowPriv(true);
        }
        setForms((forms) => ({
            ...forms,
            [key]: value,
        }));
        setRows({
            ...rows,
            [key]: value,
        });

        setClearErrors(key);
        setErrors((prevErrors) => ({ ...prevErrors, [key]: "" }));
        if(e.value){
            setTheme('bg-'+e.value);
        }
    }
 
    const validate = () => {
        const newErrors = {};
        if (!forms.name) newErrors.name = 'Name is required';
        if (!forms.is_superadmin) newErrors.is_superadmin = 'Choose privilege!';
        return newErrors;
    };

    //Convert
    const convertText = (input) => {
        return input
        .split('-') // Split the string by '-'
        .map(word => word.charAt(0).toUpperCase() + word.slice(1)) // Capitalize each word
        .join(' '); // Join the words with a space
    }
 
    const handleCreate = async (e) => {
        e.preventDefault();
    
        const newErrors = validate();
        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
        } else {
            setLoading(true);
            try {
                const response = await axios.post(
                    '/privilege/postAddSave',
                    forms,
                    {
                        headers: {
                            'Content-Type': 'multipart/form-data',
                        },
                    }
                );
                if (response.data.type === 'success') {
                    handleToast(response.data.message, response.data.type);
                    window.history.back();
                } else {
                    setErrorMessage(response.data.message);
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
    };

    function handleSetAsSuperadmin(e) {
        const {key, value} = e.target;
        setRows({
            ...rows,
            [key]: value,
        });

        if(value == 1){
            setShowPriv(false)
        }else{
            setShowPriv(true)
        }

    };
   
    const handleEdit = async (e) => {
        e.preventDefault();
        setLoading(true);
            try {
                const response = await axios.post('/privilege/postEditSave', forms, {
                    headers: {
                        'Content-Type': 'multipart/form-data',
                    },
                });
                if (response.data.type === 'success') {
                    handleToast(response.data.message, response.data.type);
                    window.history.back();
                } else {
                    setErrorMessage(response.data.message);
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
    };

    return (
        <>
            <Card href='/privileges' withButton="true" iconClass='fa fa-crown' onClick={row.length === 0 ? handleCreate : handleEdit} loading={loading} theme={theme} headerName="Privilege form" marginBottom={4}>
                <form>
                        <input
                            type="hidden"
                            name="header_id"
                            value={rows.id}
                            onChange={handleInputChange}
                        />
                        <div className="w-full">
                            <div className="flex-1">
                                <InputComponent
                                    type="text"
                                    name="name"
                                    onChange={handleInputChange}
                                    displayName="Privilege Name"
                                    placeholder="Privilege Name"
                                    value={rows.name ?? forms.name}
                                />
                                {errors.name && (
                                    <div className="font-poppins font-bold text-red-600 text-sm mt-1">
                                        {errors.name}
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className='flex gap-2 mt-2 '>
                            <div className="flex-1">
                                <DropdownSelect
                                    placeholder="Choose theme color"
                                    selectType="react-select"
                                    defaultSelect="Select them color"
                                    onChange={handleInputChange}
                                    name="theme_color"
                                    options={themeColor}
                                    value={ row.theme_color ? {label: convertText(row.theme_color) , value: row.theme_color ?? forms.theme_color} : row.theme_color ?? forms.theme_color}
                                />
                            </ div>
                            <div className="flex-1 mb-2">
                                <label className={`block text-sm font-bold ${textColor}  font-poppins`}>Is SuperAdmin</label>
                                    <div className={`relative rounded-lg mt-1 flex space-x-1 overflow-hidden border-2 bg-gray-300`}>
                                        {/* Slider Background */}
                                        <div
                                            className={`absolute top-0 left-0 h-full w-1/2 transition-all duration-300 ${
                                                forms.is_superadmin == 1 ? 'translate-x-full' : ''
                                            } ${theme} rounded-md`}
                                        ></div>

                                        {/* No Button */}
                                        <button
                                            type="button"
                                            onClick={() => handleInputChange({ target: { name: 'is_superadmin', value: '0' } })}
                                            className={`px-4 py-2 text-sm font-semibold w-full z-10 ${
                                                (forms.is_superadmin == 0 || !forms.is_superadmin) ? 'text-white' : 'text-black/50'
                                            }`}
                                        >
                                            No
                                        </button>

                                        {/* Yes Button */}
                                        <button
                                            type="button"
                                            onClick={() => handleInputChange({ target: { name: 'is_superadmin', value: '1' } })}
                                            className={`px-4 py-2 text-sm font-semibold w-full z-10 ${
                                                forms.is_superadmin == 1 ? 'text-white' : 'text-black/50'
                                            }`}
                                        >
                                            Yes
                                        </button>
                                    </div>
                                {errors.is_superadmin && (
                                    <div className="font-poppins font-bold text-red-600 text-sm mt-1">
                                        {errors.is_superadmin}
                                    </div>
                                )}
                            </div>
                        </div>
                    
                        {showPriv && (  
                                <div className="mt-4 font-medium">
                                    <p className={`text-sm ${textColor}`}>Privileges Configuration</p>
                                    <div className={`overflow-x-auto mt-5 ${bgColor}`}>
                                        <table className="min-w-full divide-y divide-gray-300">
                                            <thead>
                                                <tr>
                                                    <th scope="col" className={`px-6 py-3 ${bgColor} ${textColor} text-left text-xs font-medium uppercase tracking-wider`}>
                                                        No
                                                    </th>
                                                    <th scope="col" className={`px-6 py-3 ${bgColor} ${textColor} text-left text-xs font-medium uppercase tracking-wider`}>
                                                        Module Name
                                                    </th>
                                                    <th scope="col" className={`px-6 py-3 ${bgColor} ${textColor} text-center text-xs font-medium text-gray-500 uppercase tracking-wider`}>
                                                        All
                                                    </th>
                                                
                                                    <th scope="col" className={`px-6 py-3 ${bgColor} ${textColor} text-center text-xs font-medium text-gray-500 uppercase tracking-wider`}>
                                                        <div className="flex flex-col items-center">
                                                            <span>View</span>
                                                            <Checkbox
                                                                name="Check all vertical"
                                                                type="checkbox"
                                                                id="is_visible"
                                                                isChecked={selectAll.is_visible}
                                                                handleClick={(e) => handleSelectAll(e,"is_visible")}
                                                            />
                                                        </div>
                                                    </th>
                                                    <th scope="col" className={`px-6 py-3 ${bgColor} ${textColor} text-center text-xs font-medium uppercase tracking-wider`}>
                                                        <div className="flex flex-col items-center">
                                                            <span>Create</span>
                                                            <Checkbox
                                                                name="Check all vertical"
                                                                type="checkbox"
                                                                id="is_create"
                                                                isChecked={selectAll.is_create}
                                                                handleClick={(e) =>handleSelectAll(e,"is_create")}
                                                            />
                                                        </div>
                                                    </th>
                                                    <th scope="col" className={`px-6 py-3 ${bgColor} ${textColor} text-center text-xs font-medium uppercase tracking-wider`}>
                                                        <div className="flex flex-col items-center">
                                                            <span>Create</span>
                                                            <Checkbox
                                                                name="Check all vertical"
                                                                type="checkbox"
                                                                id="is_read"
                                                                isChecked={selectAll.is_read}
                                                                handleClick={(e) =>handleSelectAll(e,"is_read")}
                                                            />
                                                        </div>
                                                    </th>
                                                    <th scope="col" className={`px-6 py-3 ${bgColor} ${textColor} text-center text-xs font-medium uppercase tracking-wider`}>
                                                        <div className="flex flex-col items-center">
                                                            <span>Update</span>
                                                                <Checkbox
                                                                    name="Check all vertical"
                                                                    type="checkbox"
                                                                    id="is_edit"
                                                                    isChecked={selectAll.is_edit}
                                                                    handleClick={(e) =>handleSelectAll(e,"is_edit")}
                                                                />
                                                        </div>
                                                    </th>
                                                    <th scope="col" className={`px-6 py-3 ${bgColor} ${textColor} text-center text-xs font-medium uppercase tracking-wider`}>
                                                        <div className="flex flex-col items-center">
                                                            <span>Delete</span>
                                                            <Checkbox
                                                                name="Check all vertical"
                                                                type="checkbox"
                                                                id="is_delete"
                                                                isChecked={selectAll.is_delete}
                                                                handleClick={(e) =>handleSelectAll(e,"is_delete")}
                                                            />
                                                        </div>
                                                    </th>
                                                    <th scope="col" className={`px-6 py-3 ${bgColor} ${textColor} text-center text-xs font-medium uppercase tracking-wider`}>
                                                        <div className="flex flex-col items-center">
                                                            <span>Void</span>
                                                                <Checkbox
                                                                    name="Check all vertical"
                                                                    type="checkbox"
                                                                    id="is_void"
                                                                    isChecked={selectAll.is_void}
                                                                    handleClick={(e) =>handleSelectAll(e,"is_void")}
                                                                />
                                                            </div>
                                                    </th>
                                                    <th scope="col" className={`px-6 py-3 ${bgColor} ${textColor} text-center text-xs font-medium uppercase tracking-wider`}>
                                                        <div className="flex flex-col items-center">
                                                            <span>Void</span>
                                                            <Checkbox
                                                                name="Check all vertical"
                                                                type="checkbox"
                                                                id="is_override"
                                                                isChecked={selectAll.is_override}
                                                                handleClick={(e) =>handleSelectAll(e,"is_override")}
                                                            />
                                                        </div>
                                                    </th>
                                                </tr>
                                            </thead>
                                            <tbody className={`${bgColor} divide-y divide-gray-300`}>
                                                {
                                                    modules.map((modul, index) => {                                          
                                                        return (
                                                            <tr key={modul.id + index} className={`${hoverBgColor} transition-colors`}>
                                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                                    {index + 1}
                                                                </td>
                                                                <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${textColor}`}>
                                                                    {modul.name}
                                                                </td>
                                                                <td className="px-6 py-4 whitespace-nowrap text-center">
                                                                        <Checkbox
                                                                            type="checkbox"
                                                                            title="Check All Horizontal"
                                                                            isChecked={
                                                                                modul.roles
                                                                                    ?.is_visible &&
                                                                                modul.roles
                                                                                    ?.is_create &&
                                                                                modul.roles
                                                                                    ?.is_read &&
                                                                                modul.roles
                                                                                    ?.is_edit &&
                                                                                modul.roles
                                                                                    ?.is_delete &&
                                                                                modul.roles
                                                                                    ?.is_void &&
                                                                                modul.roles
                                                                                    ?.is_override
                                                                            }
                                                                            handleClick={(e) =>
                                                                                handleSelectHorizontal(
                                                                                    e,
                                                                                    modul.id
                                                                                )
                                                                            }
                                                                            className="select_horizontal"
                                                                        />
                                                                </td>
                                                                <td className="px-6 py-4 whitespace-nowrap text-center bg-blue-100">
                                                                    <Checkbox
                                                                        type="checkbox"
                                                                        className="is_visible"
                                                                        id="is_visible"
                                                                        name={`privileges[${modul.id}][is_visible]`}
                                                                        isChecked={
                                                                            modul.roles
                                                                                ?.is_visible ||
                                                                            false
                                                                        }
                                                                        handleClick={(e) =>
                                                                            handleCheckboxChange(
                                                                                e,
                                                                                modul.id,
                                                                                "is_visible"
                                                                            )
                                                                        }
                                                                        value="1"
                                                                    />
                                                                </td>
                                                                <td className="px-6 py-4 whitespace-nowrap text-center bg-yellow-100">
                                                                        <Checkbox
                                                                            type="checkbox"
                                                                            className="is_create"
                                                                            id="is_create"
                                                                            name={`privileges[${modul.id}][is_create]`}
                                                                            isChecked={
                                                                                modul.roles
                                                                                    ?.is_create ||
                                                                                false
                                                                            }
                                                                            handleClick={(e) =>
                                                                                handleCheckboxChange(
                                                                                    e,
                                                                                    modul.id,
                                                                                    "is_create"
                                                                                )
                                                                            }
                                                                            value="1"
                                                                        />                                                                  
                                                                </td>
                                                                <td className="px-6 py-4 whitespace-nowrap text-center bg-indigo-100">
                                                                    <Checkbox
                                                                        type="checkbox"
                                                                        className="is_read"
                                                                        name={`privileges[${modul.id}][is_read]`}
                                                                        isChecked={
                                                                            modul.roles
                                                                                ?.is_read ||
                                                                            false
                                                                        }
                                                                        handleClick={(e) =>
                                                                            handleCheckboxChange(
                                                                                e,
                                                                                modul.id,
                                                                                "is_read"
                                                                            )
                                                                        }
                                                                        value="1"
                                                                    />
                                                                </td>
                                                                <td className="px-6 py-4 whitespace-nowrap text-center bg-green-100">                                                                 
                                                                        <Checkbox
                                                                            type="checkbox"
                                                                            className="is_edit"
                                                                            name={`privileges[${modul.id}][is_edit]`}
                                                                            isChecked={
                                                                                modul.roles
                                                                                    ?.is_edit ||
                                                                                false
                                                                            }
                                                                            handleClick={(e) =>
                                                                                handleCheckboxChange(
                                                                                    e,
                                                                                    modul.id,
                                                                                    "is_edit"
                                                                                )
                                                                            }
                                                                            value="1"
                                                                        />
                                                                </td>
                                                                <td className="px-6 py-4 whitespace-nowrap text-center bg-orange-200">
                                                                    <Checkbox
                                                                        type="checkbox"
                                                                        className="is_delete"
                                                                        name={`privileges[${modul.id}][is_delete]`}
                                                                        isChecked={
                                                                            modul.roles
                                                                                ?.is_delete ||
                                                                            false
                                                                        }
                                                                        handleClick={(e) =>
                                                                            handleCheckboxChange(
                                                                                e,
                                                                                modul.id,
                                                                                "is_delete"
                                                                            )
                                                                        }
                                                                        value="1"
                                                                    />
                                                                </td>
                                                                <td className="px-6 py-4 whitespace-nowrap text-center bg-red-300">
                                                                        <Checkbox
                                                                            type="checkbox"
                                                                            className="is_void"
                                                                            name={`privileges[${modul.id}][is_void]`}
                                                                            isChecked={
                                                                                modul.roles
                                                                                    ?.is_void ||
                                                                                false
                                                                            }
                                                                            handleClick={(e) =>
                                                                                handleCheckboxChange(
                                                                                    e,
                                                                                    modul.id,
                                                                                    "is_void"
                                                                                )
                                                                            }
                                                                            value="1"
                                                                        />
                                                                </td>
                                                                <td className="px-6 py-4 whitespace-nowrap text-center bg-green-200">
                                                                    <Checkbox
                                                                        type="checkbox"
                                                                        className="is_override"
                                                                        name={`privileges[${modul.id}][is_override]`}
                                                                        isChecked={
                                                                            modul.roles
                                                                                ?.is_override ||
                                                                            false
                                                                        }
                                                                        handleClick={(e) =>
                                                                            handleCheckboxChange(
                                                                                e,
                                                                                modul.id,
                                                                                "is_override"
                                                                            )
                                                                        }
                                                                        value="1"
                                                                    />
                                                                </td>
                                                            </tr>
                                                        );                                     
                                                    })
                                                }
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )
                        }
                   
                </form>
            </Card>
        </>
    );
};

export default PrivilegesForm;
