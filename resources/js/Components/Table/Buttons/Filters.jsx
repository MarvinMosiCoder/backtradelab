import React from 'react'
import TableButton from './TableButton'
import { useState } from 'react';
import { useTheme } from '../../../Context/ThemeContext';
import useThemeStyles from '../../../Hooks/useThemeStyles';
const Filters = ({children, onSubmit}) => {
  const {theme} = useTheme();
  const {textColor, iconThemeColor, scrollbarTheme, textColorActive} = useThemeStyles(theme)
  const childCount = React.Children.count(children);
  const [show, setShow] = useState(false);

  const handleShow = () => {
    setShow(!show);
  }

  return (
    <>
    <div className="flex-none w-20 rounded-tr-lg">
    <TableButton extendClass={theme === 'bg-skin-black' ? theme : 'bg-gray-100 text-stone-900'} 
                 fontColor={!['bg-skin-black'].includes(theme) ? textColor : textColorActive}
                 onClick={handleShow}
    > 
                 <i className="fa fa-filter"></i> Filters
    </TableButton>
    {show && 
      <div  className={`fixed inset-0 z-[85] overflow-hidden`}>
        {/* modal backdrop  */}
        <div onClick={handleShow} className='bg-black/50 h-full w-full overflow-hidden'></div>
        {/* modal content  */}
        <div className={`h-auto max-h-[90%] w-5/6  md:w-[850px] fixed z-[52] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 ${theme === 'bg-skin-black' ? 'bg-black-table-color' : 'bg-gray-100'} rounded-lg  px-5 py-5 flex flex-col gap-4 overflow-auto`}>
          <header className={`flex items-center justify-between`}>
            <h1 className={`text-lg font-bold ${theme === 'bg-skin-black' ?  'text-gray-400' : ''} `}> <i className={`fa fa-filter ${iconThemeColor}`}></i> Filters</h1>
            <i
                className={`fa fa-times-circle ${iconThemeColor} font-extrabold text-md cursor-pointer`}
                onClick={handleShow}
            ></i>
          </header>
          <div className={`overflow-auto scrollbar-thumb-rounded-full scrollbar-track-rounded-full scrollbar scrollbar-thin p-2 ${scrollbarTheme} scrollbar-track-gray-200 cursor-pointer`}>
            <form className='flex flex-col h-full justify-between gap-5'  onSubmit={onSubmit}>
            <div className={`grid gap-4 ${childCount == 1 ? 'md:grid-cols-1' : 'md:grid-cols-2'}`}>
              {children ? children : 'Please add fields'}
            </div>
              {/* Buttons */}
              <div className='flex gap-4 justify-center items-center text-sm py-3'>
                <button onClick={handleShow} className={`py-2 px-4 bg-gray-100 border-[0.1px] border-gray-300 text-gray-900 rounded-md`} type="button">Cancel</button>
                <button className={`py-2 px-3 ${theme} border-[0.1px] text-white rounded-md`} type="submit"> <i className='fa fa-filter'></i> Filter</button>
              </div>
            </form>
          </div>

        </div>
      </div>
      }
    </div>
    </>
  )
}

export default Filters