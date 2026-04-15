import { Head, Link, router, useForm } from '@inertiajs/react';
import React, { useState, useRef, useEffect } from 'react';
import ContentPanel from '../../../Components/Table/ContentPanel';
import CustomSelect from '../../../Components/Dropdown/CustomSelect';
import InputComponent from '../../../Components/Forms/Input';
import { useTheme } from '../../../Context/ThemeContext';
import Button from '../../../Components/Table/Buttons/Button';
import Modalv2 from '../../../Components/Modal/Modalv2';
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { useToast } from '../../../Context/ToastContext';
import axios from 'axios';
import useThemeStyles from '../../../Hooks/useThemeStyles';

const MenuManagement = ({privileges, menus, inactive_menus}) => {
    const { theme } = useTheme();
    const { textColor, bgColor, hoverBgColor, textColorActive, whiteBgCoror } = useThemeStyles(theme);
    const { handleToast } = useToast();
    const [activeMenu, setActiveMenu] = useState('Active Menu');
    const [confirmModal, setConfirmModal] = useState(false);
    const [activeDragMenu, setActiveDragMenu] = useState({})
    const [isDraggingChild, setIsDraggingChild] = useState(false);
    const [isFirstLoad, setIsFirstLoad] = useState(true);


    const { data, setData, processing, reset, post, errors } = useForm({
        privilege_name: "",
        menu_name: "",
        menu_type: "Route",
        menu_icon: "",
        path: "",
        slug: "",
        items: menus || [],
    });

    const handleConfirmModalToggle = () => {
        setConfirmModal(!confirmModal);
    }

    useEffect(() => {

        if (isFirstLoad) {
            setIsFirstLoad(false);
            return;
        }
    

        if (data.items.length > 0) { 
            const postData = async () => {
                try {
                    const response = await axios.post(
                        '/menu_management/auto_update_menu',
                        {
                            items: data.items,
                        },
                        {
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': 'Bearer your_access_token',
                            },
                        }
                    );
    
                } catch (error) {
                    handleToast('Failed to update menu automatically', 'error');
                }
            };
    
            postData();
        }
    }, [data.items]);
    

    const handleDragMenuClick = (menuName) => {
        setActiveDragMenu((prevState) => ({
            ...prevState,
            [menuName]: !prevState[menuName],
        }));
    };

    const handleCreateMenuSubmit = () => {
            post('menu_management/create_menu', {
                onSuccess: (data) => {
                    const { message, type, menus } = data.props.auth.sessions;
                    handleToast(message, type);
                    console.log(menus);
                    setData((prevData) => ({
                        ...prevData,
                        privilege_name: "",
                        menu_name: "",
                        menu_type: "Route",
                        menu_icon: "",
                        path: "",
                        slug: "",
                        items: [...menus],
                    }));
                    
                    onClose();
                },
                onError: (error) => {
                }
            });
    };

    const handleDragEnd = (result) => {
        if (!result.destination) return;
    
        const { source, destination, type } = result;
        const newItems = [...data.items];
    
        if (type === "PARENT") {
            const [movedItem] = newItems.splice(source.index, 1);
            newItems.splice(destination.index, 0, movedItem);
            setData("items", newItems);
        }
    
        if (type === "CHILDREN") {
            const sourceParentIndex = parseInt(source.droppableId.replace("children-", ""));
            const destParentIndex = parseInt(destination.droppableId.replace("children-", ""));
    
            if (destination.droppableId === "parent-drop-zone") {
                // Promote the child to a parent menu
                const [movedChild] = newItems[sourceParentIndex].children.splice(source.index, 1);
                newItems.push({ ...movedChild, children: [] });
            } else if (sourceParentIndex === destParentIndex) {
                const [movedChild] = newItems[sourceParentIndex].children.splice(source.index, 1);
                newItems[sourceParentIndex].children.splice(destination.index, 0, movedChild);
            } else {
                const [movedChild] = newItems[sourceParentIndex].children.splice(source.index, 1);
                newItems[destParentIndex].children.splice(destination.index, 0, movedChild);
            }
    
            setData("items", newItems);
        }
    };

    const handleMoveParentToAnotherParent = (parentId, targetParentId) => {
        const newItems = [...data.items];
        const parentItem = newItems.find(item => item.id === parentId);
        const targetParentItem = newItems.find(item => item.id === targetParentId);

        if (!parentItem || !targetParentItem) return;

        const filteredItems = newItems.filter(item => item.id !== parentId);

        if (!targetParentItem.children) {
            targetParentItem.children = [];
        }

        targetParentItem.children.push({...parentItem, children: parentItem.children || []});

        setData('items', filteredItems);
    };

   
    
    return (
        <>
            <Head title="Menu Management" />
            <ContentPanel>
                <span className={`font-bold text-lg ${textColor}`}>Welcome to Menu Management</span>
                <p className='text-sm text-gray-500'>Organize and configure menu items for different user privileges. Drag and drop to rearrange items.</p>
                <div className='flex flex-col-reverse md:flex-row mt-4 select-none'>
                    {/* MENUS */}
                    <div className='p-2 rounded-lg md:w-[60%]'>
                        {/* MENU BUTTONS */}
                        {/* ${theme === 'bg-skin-black' ? ' text-white' : 'text-black/80'} */}
                        <div className={`${theme === 'bg-skin-black' ? 'bg-black/30' : 'bg-gray-200'} p-1  w-fit flex space-x-1`}>
                            <button className={`${activeMenu == 'Active Menu' ? bgColor : 'hover:bg-black/10 border-transparent'} flex items-center p-2 border  rounded-md outline-none`} onClick={()=>{setActiveMenu('Active Menu');}}>
                                <i className={`${activeMenu == 'Active Menu' ? 'text-green-500' : 'text-gray-500'} fa-solid fa-check  mr-2`}></i>
                                <p className={`${activeMenu == 'Active Menu' ? theme == 'bg-skin-black' ? 'text-white' : 'text-black' : 'text-gray-500'} font-semibold text-xs mr-3`}>Menu Order</p>
                                <div className={`${activeMenu == 'Active Menu' ? 'border-green-500 text-green-700 bg-green-200' : 'border-gray-500 text-gray-700 bg-gray-300'} text-[10px] font-semibold  rounded-full border py-0.5 px-2.5 `}>Active</div>
                            </button>
                            <button className={`${activeMenu == 'Inactive Menu' ? bgColor : 'hover:bg-black/10 border-transparent'} flex items-center p-2 border  rounded-md outline-none`} onClick={()=>{setActiveMenu('Inactive Menu');}}>
                                <i className={`${activeMenu == 'Inactive Menu' ? 'text-red-500' : 'text-gray-500'} fa-solid fa-xmark mr-2`}></i>
                                <p className={`${activeMenu == 'Inactive Menu' ? theme == 'bg-skin-black' ? 'text-white' : 'text-black' : 'text-gray-500'} font-semibold text-xs mr-3`}>Menu Order</p>
                                <div className={`${activeMenu == 'Inactive Menu' ? 'border-red-500 text-red-700 bg-red-200' : 'border-gray-500 text-gray-700 bg-gray-300'} text-[10px] font-semibold rounded-full border py-0.5 px-2.5`}>Inactive</div>
                            </button>
                        </div>

                        {activeMenu === 'Active Menu' ? 
                            <div className='border-2 mt-3 rounded-lg py-2 px-3'>
                                <span className={`${theme === 'bg-skin-black' ? ' text-white' : 'text-black/90'} font-bold text-sm`}>Active Menu Items</span>
                                <p className='text-xs font-medium mb-3 text-gray-500'>Click and drag to reorder menu items. Changes are saved automatically</p>

                                {data.items.length !== 0 ? 
                                    <DragDropContext 
                                    onDragStart={(start) => {
                                        if (start.type === "CHILDREN") {
                                            setIsDraggingChild(true);
                                        }
                                    }}
                                    onDragEnd={(result) => {
                                        setIsDraggingChild(false); 
                                        handleDragEnd(result); 
                                    }}>
                                        <div className="max-h-[30rem] overflow-y-auto scrollbar-none">
                                            {/* PARENT DROPPABLE */}
                                            <Droppable droppableId="list" type='PARENT'>
                                            {(provided) => (
                                                <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-2"
                                                >
                                                {/* PARENT DRAGGABLE */}
                                                {data.items.map((item, parentIndex) => {
                                                    const parentOptions = data.items
                                                    .filter(targetParent => targetParent.id !== item.id)
                                                    .map((targetParent) => ({
                                                        value: targetParent.id,
                                                        label: targetParent.name
                                                    }));

                                                    return  <Draggable key={item.id} draggableId={item.name + parentIndex} index={parentIndex}>
                                                        {(provided) => (
                                                            <div ref={provided.innerRef} {...provided.draggableProps}>
                                                                <div
                                                                    className={`${bgColor} p-4 flex items-center select-none border-2 rounded-lg shadow-sm hover:shadow-md `}
                                                                >   
                                                                    {/* DRAG ICON */}
                                                                    <span {...provided.dragHandleProps} className="cursor-grab text-gray-400  hover:text-gray-400/70 mr-3">
                                                                        <i className="fa-solid fa-grip-vertical"></i>
                                                                    </span>
                                                                    
                                                                    {/* MENU ICON */}
                                                                    <div className={`p-3 flex items-center rounded-lg ${theme === 'bg-skin-white' ? whiteBgCoror : theme} mr-3`}>
                                                                        <i className={`${item.icon} text-white`}></i>    
                                                                    </div>
                                                                    {/* ITEM NAME AND PRIVS */}
                                                                    <div className='flex-1 flex-col'>
                                                                        <p className={`${theme === 'bg-skin-black' ? textColor : 'text-black/80'} mb-1 font-semibold `}>{item.name}</p>
                                                                        <div className='flex flex-wrap gap-1'>
                                                                            {item.get_menus_privileges && item.get_menus_privileges?.map((privilege, index)=>(
                                                                                <p key={privilege.get_privilege?.name + index} className='text-[10px] text-nowrap bg-cyan-400 text-white px-2  py-0.5 rounded-full font-semibold'>{privilege.get_privilege?.name}</p>
                                                                            ))}
                                                                        </div>
                                                                    </div>
                                                                    {item.children?.length == 0 && 
                                                                        <CustomSelect
                                                                            options={parentOptions}
                                                                            addMainClass="mr-2"
                                                                            selectType='react-select'
                                                                            onChange={(selectedOption) =>
                                                                                handleMoveParentToAnotherParent(item.id, selectedOption?.value)
                                                                            }
                                                                            menuPlacement={ parentIndex === data.items.length - 1 ? "top" : "auto" }

                                                                            placeholder="Move to..."
                                                                            className='w-full'
                                                                        />
                                                                    }
                                                                    {/* ACTIONS */}
                                                                    <div className='flex items-center space-x-2'>
                                                                        {/* EDIT ICON */}
                                                                        <Link href={`/menu_management/edit/${item.id}`}>
                                                                            <div className='text-sm w-6 h-6 p-4 flex items-center justify-center hover:bg-gray-300 cursor-pointer group rounded-full '>
                                                                                <i className="fa-solid fa-pen text-gray-400 group-hover:text-white "></i>
                                                                            </div>
                                                                        </Link>
                                                                        {/* MENU OPEN ICON */}
                                                                        {item.children?.length !== 0 && 
                                                                            <div className='text-sm w-6 h-6 p-4 flex items-center justify-center hover:bg-gray-300 cursor-pointer group rounded-full '
                                                                            onClick={()=>{handleDragMenuClick(item.name)}}>
                                                                                <i className={`fa-solid fa-caret-down text-gray-400 group-hover:text-white ${activeDragMenu[item.name] ? '-rotate-180': ''}`}></i>
                                                                            </div>
                                                                        }
                                                                       
                                                                        
                                                                    </div>
                                                                </div>

                                                                {/* CHILD DROPPABLE */}
                                                                <Droppable droppableId={`children-${parentIndex}`} type="CHILDREN">
                                                                    {(provided) => (
                                                                        <div
                                                                            ref={provided.innerRef}
                                                                            {...provided.droppableProps}
                                                                            className={`ml-6 border-l-2 ${activeDragMenu[item.name] ? 'max-h-[1000rem] opacity-100 ' : 'max-h-0 opacity-0'} space-y-2 transition-all duration-1000 overflow-hidden`}
                                                                        >
                                                                            {/* CHILD DRAGGABLE */}
                                                                            {item.children?.map((child, childIndex) => (
                                                                                <Draggable
                                                                                    key={child.id}
                                                                                    draggableId={child.name + childIndex}
                                                                                    index={childIndex}
                                                                                >
                                                                                    {(provided) => (
                                                                                        <div className={`${theme === 'bg-skin-black' ? ' bg-login-bg-color' : 'bg-white'} flex items-center p-3 border first:mt-2 ml-3 rounded-lg`}  ref={provided.innerRef} {...provided.draggableProps}>
                                                                                            <span className="cursor-grab text-gray-400 text-xs hover:text-gray-400/70 mr-3 " {...provided.dragHandleProps}>
                                                                                                <i className="fa-solid fa-grip-vertical"></i>
                                                                                            </span>
                                                                                            <div className={`p-2 flex items-center rounded-lg ${theme} mr-3`}>
                                                                                                <i className={`${child.icon} text-white text-[10px]`}></i>    
                                                                                            </div>
                                                                                            <div className='flex-1 flex-col'>
                                                                                                <p className={`${theme === 'bg-skin-black' ? ' text-white' : 'text-black/80'} mb-1 font-semibold text-xs`}>{child.name}</p>
                                                                                                <div className='flex flex-wrap gap-1'>
                                                                                                    {child.get_menus_privileges && child.get_menus_privileges?.map((privilege, index)=>(
                                                                                                        <p key={privilege.get_privilege?.name + index} className='text-[10px] text-nowrap bg-cyan-400 text-white px-2  py-0.5 rounded-full font-semibold'>{privilege.get_privilege?.name}</p>
                                                                                                    ))}
                                                                                                </div>
                                                                                            </div>
                                                                                            <Link href={`/menu_management/edit/${child.id}`}>
                                                                                                <div className='flex items-center space-x-2'>
                                                                                                    <div className='text-sm w-5 h-5 p-4 flex items-center justify-center hover:bg-gray-300 cursor-pointer group rounded-full '>
                                                                                                        <i className="fa-solid fa-pen text-xs text-gray-400 group-hover:text-white "></i>
                                                                                                    </div>
                                                                                                </div>
                                                                                            </Link>
                                                                                        </div>
                                                                                    )}
                                                                                </Draggable>
                                                                            ))}
                                                                            {provided.placeholder}
                                                                        </div>
                                                                    )}
                                                                </Droppable>
                                                            </div>
                                                        )}
                                                    </Draggable>
                                                   
                                                
                                                })}
                                                {provided.placeholder}
                                                </div>
                                            )}
                                            </Droppable>
                                        </div>
                                        {/* DROPPABLE TO MAKE THE CHILD A PARENT */}
                                        <Droppable droppableId="parent-drop-zone" type="CHILDREN">
                                            {(provided) => (
                                                <div
                                                    ref={provided.innerRef}
                                                    {...provided.droppableProps}
                                                    className={`relative w-full p-4 border-2 rounded-lg mt-4 flex items-center justify-center transition-all duration-300 ${
                                                        isDraggingChild
                                                            ? "bg-blue-100 border-blue-400"
                                                            : "bg-gray-100 border-dashed border-gray-300"
                                                    }`}
                                                >
                                                    <p
                                                        className={`absolute text-sm font-semibold transition-all duration-300 ${
                                                            isDraggingChild ? "text-blue-600" : "text-gray-500"
                                                        }`}
                                                    >
                                                        Drag a child menu here to make it a Parent Menu
                                                    </p>
                                                    {provided.placeholder}
                                                </div>
                                            )}
                                        </Droppable>
                                    </DragDropContext>
                                    : 
                                    <div className="select-none w-full h-64 flex items-center justify-center border border-dashed rounded-lg border-gray-300">
                                        <p className="font-semibold text-gray-300">
                                            Active Menu is Empty
                                        </p>
                                    </div>
                                }
                            </div>
                        :
                            <div className='border-2 mt-3 rounded-lg py-2 px-3'>
                                <span className={`${theme === 'bg-skin-black' ? ' text-white' : 'text-black/90'} font-bold text-sm`}>Inactive Menu Items</span>
                                <p className='text-xs font-medium mb-3 text-gray-500'>Click edit icon to configure inactive menus</p>

                                <div className='max-h-[30rem] overflow-y-auto scrollbar-none space-y-2'>
                                    {inactive_menus?.length != 0 ?
                                        inactive_menus.map((item, index)=>(
                                            <div
                                                className={`${theme === 'bg-skin-black' ? ' bg-login-bg-color' : 'bg-white'} p-4 flex items-center select-none border-2 rounded-lg shadow-sm hover:shadow-md `} key={item.id + index}
                                            >   
                                                {/* MENU ICON */}
                                                <div className={`p-3 flex items-center rounded-lg ${theme} mr-3`}>
                                                    <i className={`${item.icon} text-white`}></i>    
                                                </div>
                                                {/* ITEM NAME AND PRIVS */}
                                                <div className='flex-1 flex-col'>
                                                    <p className={`${theme === 'bg-skin-black' ? ' text-white' : 'text-black/80'} mb-1  font-semibold`}>{item.name}</p>
                                                    <div className='flex flex-wrap gap-1'>
                                                        {item.get_menus_privileges && item.get_menus_privileges?.map((privilege, index)=>(
                                                            <p key={privilege.get_privilege?.name + index} className='text-[10px] text-nowrap bg-cyan-400 text-white px-2  py-0.5 rounded-full font-semibold'>{privilege.get_privilege?.name}</p>
                                                        ))}
                                                    </div>
                                                </div>
                                                {/* ACTIONS */}
                                                <div className='flex items-center space-x-2'>
                                                    {/* EDIT ICON */}
                                                    <Link href={`/menu_management/edit/${item.id}`}>
                                                        <div className='text-sm w-6 h-6 p-4 flex items-center justify-center hover:bg-gray-300 cursor-pointer group rounded-full '>
                                                            <i className="fa-solid fa-pen text-gray-400 group-hover:text-white "></i>
                                                        </div>
                                                    </Link>
                                                </div>
                                            </div>
                                        ))
                                    :

                                    <div className="select-none w-full h-64 flex items-center justify-center border border-dashed rounded-lg border-gray-300">
                                        <p className="font-semibold text-gray-300">
                                            Inactive Menu is Empty
                                        </p>
                                    </div>
                                    
                                    }
                                </div>
                                
                                
                            </div>
                        }

                    </div>
                    {/* CREATE MENU TAB */}
                    <div className='border-2 p-4 rounded-lg md:w-[40%] h-fit ml-2'>
                        <div className='flex items-center'>
                            <img src="/images/others/menu.png" className="w-5 h-5 cursor-pointer duration-500"/>
                            <p className={`${theme === 'bg-skin-black' ? ' text-white' : 'text-black/90'} font-bold ml-3`}>Create Menu</p>
                        </div>
                        <p className='font-medium text-xs text-gray-500 mt-1'>Add a new menu item and assign privileges</p>
                        <CustomSelect
                            placeholder="Choose Privilege"
                            selectType="react-select"
                            defaultSelect="Select Privilege"
                            addMainClass="mt-5"
                            onChange={(selectedOption) => setData((prevData) => ({
                                ...prevData,
                                id_adm_privileges: selectedOption?.value,
                                privilege_name: selectedOption?.label
                            }))}
                            name="privilege"
                            isStatus={false}
                            options={privileges}
                        />
                        {(errors.privilege_name) && (
                            <div className="font-poppins text-xs font-semibold text-red-600 mt-1">
                                {errors.privilege_name}
                            </div>
                        )}
                        <InputComponent
                            name="menu_name"
                            addClass="mt-2"
                            value={data.menu_name}
                            placeholder="Enter Menu Name"
                            onChange={(e)=> setData("menu_name", e.target.value)}
                        />
                        {(errors.menu_name) && (
                            <div className="font-poppins text-xs font-semibold text-red-600 mt-1">
                                {errors.menu_name}
                            </div>
                        )}

                        <div className='mt-2'>
                            <label className={`block text-sm font-bold ${theme === 'bg-skin-black' ? ' text-gray-400' : 'text-gray-700'}  font-poppins`}>Menu Type</label>
                            <div className="relative rounded-lg mt-1 flex space-x-1 overflow-hidden border-2 bg-gray-300">
                                <div
                                    className={`absolute ${theme} rounded-md h-full w-1/2 transition-all duration-300 ${
                                    data.menu_type === "Route" ? "left-0" : "left-1/2"}`}
                                >
                                </div>
                                <button
                                    className={` flex-1 py-1 z-10 outline-none text-sm font-medium
                                    ${data.menu_type === "Route" ? "text-white" : "text-black/50"}`}
                                    onClick={() => setData("menu_type", "Route")}
                                >
                                    Route
                                </button>
                                <button
                                    className={`flex-1 py-1.5 z-10 outline-none text-sm font-medium
                                    ${data.menu_type == "URL" ? "text-white" : "text-black/50"}`}
                                    onClick={() => setData("menu_type", "URL")}
                                >
                                    URL
                                </button>
                            </div>
                        </div>
                        {(errors.menu_type) && (
                            <div className="font-poppins text-xs font-semibold text-red-600 mt-1">
                                {errors.menu_type}
                            </div>
                        )}

                        <InputComponent
                            name="path"
                            addClass="mt-2"
                            value={data.path}
                            placeholder="Enter Path (if menu type is URL just add #)"
                            onChange={(e)=> setData("path", e.target.value)}
                        />
                        {(errors.path) && (
                            <div className="font-poppins text-xs font-semibold text-red-600 mt-1">
                                {errors.path}
                            </div>
                        )}

                        <InputComponent
                            name="slug"
                            addClass="mt-2"
                            value={data.slug}
                            placeholder="Enter Slug (if menu type is URL leave it empty)"
                            onChange={(e)=> setData("slug", e.target.value)}
                        />
                        {(errors.slug) && (
                            <div className="font-poppins text-xs font-semibold text-red-600 mt-1">
                                {errors.slug}
                            </div>
                        )}
                        <InputComponent
                            name="menu_icon"
                            addClass="mt-2"
                            value={data.menu_icon}
                            placeholder="Enter Icon (ex. fa-regular fa-circle)"
                            onChange={(e)=> setData("menu_icon", e.target.value)}
                        />
                        {(errors.menu_icon) && (
                            <div className="font-poppins text-xs font-semibold text-red-600 mt-1">
                                {errors.menu_icon}
                            </div>
                        )}

                        <Button
                            type='button'
                            onClick={handleConfirmModalToggle}
                            extendClass={`${theme} text-white mt-5 font-semibold w-full`}>
                            <p className='w-full'>Add Menu</p>
                        
                        </Button>
                    </div>
                </div>
              

            </ContentPanel>
            <Modalv2 
                isOpen={confirmModal} 
                setIsOpen={handleConfirmModalToggle}
                title="Confirmation"
                confirmButtonName="Create Menu"
                content="Are you sure you want to create Menu"
                onConfirm={handleCreateMenuSubmit}
            />
        </>
    );
}

export default MenuManagement


