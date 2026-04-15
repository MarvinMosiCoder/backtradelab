import { Head, Link, router } from '@inertiajs/react';
import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { useToast } from '../../Context/ToastContext';
import { useTheme } from '../../Context/ThemeContext';
import useSwalColor from '../../Hooks/useThemeSwalColor';
import Card from '../../Components/Forms/Card';
import InputComponent from '../../Components/Forms/Input';
import Select from 'react-select';
import isDashboardTypes from './isDashboardType';
import RouteTypes from './RouteTypes';
import Button from '../../Components/Table/Buttons/Button';
import useThemeStyles from '../../Hooks/useThemeStyles';

const MenusIndex = ({
    menu_active,
    menu_inactive,
    super_admin,
    privileges
}) => {
    const {theme} = useTheme();
    const { handleToast } = useToast();
    const [menuActive, setMenuActive] = useState(menu_active);
    const [menuInactive, setMenuInactive] = useState(menu_inactive);
    const [draggingItem, setDraggingItem] = useState(null);
    const [draggingOverItem, setDraggingOverItem] = useState(null);
    const scrollContainerRef = useRef(null);
    const [isDragging, setIsDragging] = useState(false);
    const swalColor = useSwalColor(theme);
    const [privilegesId, setPrivilegesId] = useState([]);
    const [options, setOptions] = useState([]);
    const [selectedOptionType, setSelectedOptionType] = useState(null);
    const [loading, setLoading] = useState(false);
    const [forms, setForms] = useState({
        name: '',
        icon: ''
    });
    const { textColor, primayActiveColor, textColorActive, whiteBgCoror, bgColor } = useThemeStyles(theme);

    useEffect(() => {
        setPrivilegesId(super_admin.map(priv => priv.id));
    }, [super_admin]);

    useEffect(() => {
        setOptions(RouteTypes);
    }, []);

    const handlePrivilegesChange = (selectedOptions) => {
        setPrivilegesId(selectedOptions.map(option => option.value));
    };
    
    const handleOptionChange = (event) => {
        setSelectedOptionType(event.target.value);
    };

    const handleChange = (e) => {
        const key = e.target.name;
        const value =  e.target.value;
 
        setForms((forms) => ({
            ...forms,
            [key]: value,
        }));
    }

    const handleWheel = (e) => {
        handleAutoScroll(e);
    };

    const handleDragStart = (e, item, parentIndex, isActive, index) => {
        setIsDragging(true);
        handleWheel(e);
        e.stopPropagation(parentIndex);
        setDraggingItem({ item, parentIndex, isActive, index });
    
    };

    const handleDragOver = (e, targetIndex, targetParentIndex) => {
        e.preventDefault();
        e.stopPropagation();
        setDraggingOverItem({ targetIndex, targetParentIndex });
    };

    const handleDrop = async (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        if (draggingItem && draggingOverItem) {
            try {
                let updatedMenus = draggingItem.isActive
                    ? [...menuActive]
                    : [...menuInactive];
                const {
                    item: draggedItem,
                    parentIndex: sourceParentIndex,
                    isActive,
                    index: draggedIndex,
                } = draggingItem;
                const { targetIndex, targetParentIndex } = draggingOverItem;

                const sourceParent = updatedMenus[sourceParentIndex];
                const targetParent =
                    targetParentIndex !== undefined
                        ? updatedMenus[targetParentIndex??targetIndex]
                        : null;

                // Remove the dragged item from its current position
                if (sourceParent) {
                    if (sourceParent.children) {
                        sourceParent.children = sourceParent.children.filter(
                            (_, i) => i !== draggedIndex
                        );
                    } else {
                        updatedMenus = updatedMenus.filter(
                            (_, i) => i !== sourceParentIndex
                        );
                    }
                } else {
                    updatedMenus = updatedMenus.filter(
                        (_, i) => i !== draggedIndex
                    );
                }
          
          
                // Insert the dragged item into the new position
                if (targetParent) {
                    if (!targetParent.children && targetParent.type !== 'Route'){
                        targetParent.children = []
                        targetParent.children.push(draggedItem);
                    } else if(targetParent.children){
                        targetParent.children.splice(targetIndex, 0, draggedItem);
                    }else{
                        updatedMenus.splice(targetIndex, 0, draggedItem);
                    }
                } else {
                    updatedMenus.splice(targetIndex, 0, draggedItem);
                }
           
                // Update the state and save the menu
                if (isActive) {
                    setMenuActive(updatedMenus);
                    handleSaveMenu(updatedMenus, true);
                } else {
                    setMenuInactive(updatedMenus);
                    handleSaveMenu(updatedMenus, false);
                }

                // Clear dragging states
                setDraggingItem(null);
                setDraggingOverItem(null);
            } catch (error) {
                console.error('Error updating menu order:', error);
            }
        }
    };

    const handleSaveMenu = async (menus, isActive) => {
        // console.log(menus);
        try {
            const response = await axios.post('/menu_management/add', {
                menus: JSON.stringify(menus),
                isActive,
            });

            handleToast(response.data.message, response.data.type);
   
            router.reload({ only: ['Menus'] });
        } catch (error) {
            console.error('Error saving menu:', error);
        }
    };

    const handleMenusEvent = async (id, value) => {
        const bulk_action_type = value;
        Swal.fire({
            title: `<p class="font-poppins" >Set to ${
                !bulk_action_type == 0 ? "Active" : "Inactive"
            }?</p>`,
            showCancelButton: true,
            confirmButtonText: 'Confirm',
            confirmButtonColor: swalColor,
            icon: 'question',
            iconColor: swalColor,
            reverseButtons:true
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    const response = await axios.post(
                        '/set-status-menus',
                        { id , bulk_action_type},
                        {
                            headers: {
                                'Content-Type': 'multipart/form-data',
                            },
                        }
                    );
                    if (response.data.status == 'success') {
                        handleToast(response.data.message, response.data.status);
                        router.reload();
                    }
                } catch (error) {}
            }
        });
    }

    const renderMenuItems = (menus, isActive, parentIndex = null) => {
        return menus.map((menu, index) => (
            <>
            
            <div
                key={menu.id + index + menu.name} 
                data-id={menu.id}
                data-name={menu.name}
                draggable
                onDragStart={(e) =>
                    handleDragStart(e, menu, parentIndex, isActive, index)
                }
                onDragOver={(e) => handleDragOver(e, index, parentIndex)}
                onDrop={handleDrop}
                className={` ${
                    parentIndex == null ? `shadow-menus ${theme === 'bg-skin-black' ? 'bg-stone-900' : ''}` : `shadow-menuchild ${theme === 'bg-skin-black' ? 'bg-stone-800' : 'bg-gray-100'}`
                } ${theme === 'bg-skin-black' ? 'text-gray-400' : 'text-black'} rounded-md cursor-grab`}
            >
                <div
                    className={`flex items-center justify-between ${
                        parentIndex == null ? "pl-3 pt-3" : "pl-3 pt-3"
                    }`}
                >
                    <div className="flex items-center gap-3">
                        <i
                            className={`${menu.icon}  ${
                                parentIndex == null ? "text-xl" : "text-md"
                            }`}
                        ></i>
                        <p
                            className={`${
                                parentIndex == null
                                    ? "text-md font-bold"
                                    : "text-sm"
                            }`}
                        >
                            {menu.name}
                        </p> 
                    </div>

                    <div className="mr-3 flex items-center gap-1">
                        <Link
                            className={`fa fa-pencil ${textColor} ${
                                parentIndex == null ? "text-lg" : "text-sm"
                            }`}
                            action="edit"
                            href={`/menu_management/edit/${menu.id}`}
                        ></Link>
                        &nbsp;&nbsp;
                        {menu.is_active == 1 ?   <a
                            title="Delete"
                            className={`fa fa-times-circle ${textColor} ${
                                parentIndex == null ? "text-lg" : "text-sm"
                            }`}
                            onClick={() => handleMenusEvent(menu.id,0)}
                        ></a> 
                        :
                        <a
                            title="Delete"
                            className={`fa fa-check-circle ${textColorActive} ${
                                parentIndex == null ? "text-lg" : "text-sm"
                            }`}
                            onClick={() => handleMenusEvent(menu.id,1)}
                        ></a> }
                    </div>
                </div>
                <em className="text-md">
                    <small>
                        <i className="fa fa-users ml-3 pb-3" /> &nbsp;&nbsp; {menu.privileges && menu.privileges.join(', ')}
                    </small>
                </em>
            </div>
            {menu.children && menu.children.length > 0 && (
                    <div className="border-t-1 border-white">
                        <div className="space-y-1 pl-9">
                            {renderMenuItems(menu.children, isActive, index)}
                        </div>
                    </div>
                )}
            </>
        ));
    };

    const handleAutoScroll = (e) => {
        const container = scrollContainerRef.current;
        const rect = container.getBoundingClientRect();
        const scrollThreshold = 50; // Adjust this value to control the sensitivity of the scroll
        const scrollSpeed = 20; // Adjust this value to control the speed of the scroll
        if (e.clientY < rect.top + scrollThreshold) {
            // Scroll up
            container.scrollBy({ top: -scrollSpeed, behavior: 'smooth' });
        } else if (e.clientY > rect.bottom - scrollThreshold) {
            // Scroll down
            container.scrollBy({ top: scrollSpeed, behavior: 'smooth' });
        }
    };

    //ADD MENUS
    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const response = await axios.post('/menu_management/postCreateMenus', {
                forms, 
                privilegesId, 
                selectedOptionType
            });
            if (response.data.type == 'success') {
                handleToast(response.data.message, response.data.status);
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

    const colourStyles = {
        multiValue: (styles, { data }) => {
            const color = data.color;
            return {
                ...styles,
                // Add any additional styles if needed
            };
        },
        multiValueLabel: (styles, { data }) => ({
            ...styles,
            color: data.color,
        }),
        multiValueRemove: (styles, { data }) => ({
            ...styles,
            ':hover': {
                backgroundColor: data.color,
                color: 'white',
            },
            backgroundColor: swalColor, // Assuming swalColor is defined elsewhere
            color: 'white', // Removed the duplicate color key
        }),
        
    };

    const customStyles = {
        control: (provided) => ({
            ...provided,
            backgroundColor: "#101215", // Dark background (Tailwind's bg-gray-800)
            borderColor: "#9CA3AF)", // Border color (Tailwind's border-gray-600)
            color: "#fff", // Text color
            boxShadow: "none",
            "&:hover": {
                borderColor: "#9ca3af", // Hover state border color (Tailwind's border-gray-400)
            },
        }),
        singleValue: (provided) => ({
            ...provided,
            color: "#9CA3AF", // Ensure selected value text is white
        }),
        menu: (provided) => ({
            ...provided,
            backgroundColor: "#1f2937", // Dark background for dropdown menu
            color: "#9CA3AF", // Dropdown text color
        }),
        option: (provided, state) => ({
            ...provided,
            backgroundColor: state.isFocused ? "#374151" : "#1f2937", // Highlight on hover (Tailwind's bg-gray-700)
            color: "#9CA3AF", // Option text color
            "&:active": {
                backgroundColor: "#4b5563", // Active state background
            },
        }),
        multiValue: (styles, { data }) => {
            const color = data.color;
            return {
                ...styles,
                backgroundColor: "#232222"
            };
        },
        multiValueLabel: (styles, { data }) => ({
            ...styles,
            color: data.color,
        }),
        multiValueRemove: (styles, { data }) => ({
            ...styles,
            ':hover': {
                backgroundColor: data.color,
                color: 'white',
            },
            backgroundColor: swalColor, // Assuming swalColor is defined elsewhere
            color: 'white', // Removed the duplicate color key
        }),
    };
    

    return (
        <div ref={scrollContainerRef} onWheel={handleWheel}>
            <Head title="Menu Management" />
                <div className="mb-5 text-red-400">
                    *Welcome to the Menu Management page! To rearrange the
                    items, set menus for specific privilege. Click and hold an item, then drag it to the
                    desired position and release.
                </div>
            <div className="flex gap-10 flex-col justify-between lg:flex-row">
                <div className="lg:w-[60%] w-full">
                    {/* MENU ORDER ACTIVE */}
                    <Card setTextColor="text-green-900" themeHead="bg-menus-header-color-green" headerName="Menu Order (Active)" marginBottom={4} iconClass="fa fa-check-circle" >
                        <div className="px-3 py-3">
                            <div className="draggable-menu draggable-menu-active list-disc space-y-1">
                                {renderMenuItems(menuActive, true)}
                            </div>
                            {menuActive.length === 0 && (
                                <div
                                    align="center"
                                    id="inactive_text"
                                    className="text-gray-400 border-dashed border-gray-400 border p-10 flex justify-center items-center gap-3"
                                >
                                    <i className="fa solid fa-inbox text-xl"></i>
                                    <span className="font-bold ">
                                        Active Menu is Empty, Please Add New
                                        Menu
                                    </span>
                                </div>
                            )}
                        </div>
                    </Card>
                    {/* MENU ORDER INACTIVE */}
                
                    <Card themeHead="bg-red-300" setTextColor="text-red-900" headerName="Menu Order (In Active)" marginBottom={4} iconClass="fa fa-times-circle" >
                        <div className="p-5">
                            <div className="draggable-menu draggable-menu-inactive space-y-1">
                                {renderMenuItems(menuInactive, false)}
                            </div>
                            {menuInactive.length === 0 && (
                                <div
                                    align="center"
                                    id="inactive_text"
                                    className="text-gray-400 border-dashed border-gray-400 border p-10  flex justify-center items-center gap-3"
                                >
                                    <i className="fa solid fa-inbox text-xl"></i>
                                    <span className="font-bold ">
                                        Inactive Menu is Empty
                                    </span>
                                </div>
                            )}
                        </div>
                    </Card>
                </div>
                <div className="lg:w-[40%] w-full">
                    <Card themeHead={`${theme} `} headerName="Create Menus" marginBottom={4} iconClass="fa fa-add">
                        <form onSubmit={handleSubmit}>
                            <div className="mb-3 w-full">
                                <label for="select-multiple" className={`block text-sm font-medium ${textColorActive}`}> Privilege</label>
                                <Select
                                    isMulti
                                    name="privileges_id"
                                    className="block w-full py-2 border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                    value={privileges.filter(priv => privilegesId.includes(priv.id)).map(priv => ({ value: priv.id, label: priv.name }))}
                                    onChange={handlePrivilegesChange}
                                    options={privileges.map(priv => ({ value: priv.id, label: priv.name }))}
                                    styles={theme === 'bg-skin-black' ? customStyles : colourStyles}
                                />
                            </div>
                            <div className="mb-3 w-full">
                                <InputComponent
                                    type="text"
                                    name="name"
                                    value={forms.name}
                                    onChange={handleChange}
                                />
                            </div>
                            <div className="mb-3 w-full p-2">
                                 <label for="select-multiple" className={`block text-sm font-medium ${textColorActive}`}> Type</label>
                                 {options.map(option => (
                                    <div key={option.id}>
                                    
                                        <input 
                                            type="radio" 
                                            id={`option-${option.id}`} 
                                            className="mt-2"
                                            name="type"
                                            value={option.id} 
                                            checked={selectedOptionType === option.id.toString()} 
                                            onChange={handleOptionChange} 
                                        />
                                          <label  className="ml-2 text-sm">{option.name}</label>
                                    </div>
                                ))}
                            </div>
                            <div className="mb-3 w-full">
                                <InputComponent
                                    type="text"
                                    name="icon"
                                    value={forms.icon}
                                    onChange={handleChange}
                                />
                            </div>

                            <Button
                                type="button"
                                extendClass={ (theme === 'bg-skin-white' ? whiteBgCoror : theme) +" float-right text-right mt-5"}
                                disabled={loading}
                                fontColor={textColor}
                            >
                                <i className="fa fa-plus-circle"></i> {loading ? "Submitting..." : "Add menu"}
                            </Button>
                        </form>
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default MenusIndex;
