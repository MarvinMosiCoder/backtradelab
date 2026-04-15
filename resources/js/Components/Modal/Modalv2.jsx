import React from 'react'
import Lottie from "lottie-react";
import SuccessAnim from '../../../../public/Animations/success-anim.json';
import ErrorAnim from '../../../../public/Animations/error-anim.json';
import WarningAnim from '../../../../public/Animations/warning-anim.json';
import Buttonv2 from '../Table/Buttons/Buttonv2';

const Modalv2 = ({isInfoModal = false, modalType = 'success', isOpen, setIsOpen, title, content, closeButton = false, cancelButton = true, cancelButtonColor = 'bg-gray-200', cancelButtonName = 'Cancel', confirmButtonName = 'Confirm', confirmButtonType = 'button', confirmButtonColor, href, confirmButtonIcon = null, onConfirm, infoButtonName = 'Got it'}) => {
    const handleButtonClick = () => {
        setIsOpen(!isOpen);
    };
  return (
    <div className={`fixed inset-0 z-100 select-none w-screen font-parkinsans h-screen bg-black/50 flex justify-center items-center duration-100 ease-in ${isOpen ? 'opacity-100' : 'opacity-0  pointer-events-none'}`}>
      <div className={`bg-white p-5 max-w-[30rem] w-full m-5 rounded-lg shadow-lg duration-300 ease-in-out ${isOpen ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'}`}>
        {closeButton && <i className="fa-solid fa-xmark absolute top-4 right-4 text-gray-400 px-1 py-0.5 rounded-full hover:bg-gray-100 cursor-pointer" onClick={handleButtonClick}></i>}
        {!isInfoModal ?
          <>
            <p className="mb-2 text-black font-semibold text-lg">{title}</p>
            <p className='text-sm text-gray-500 mb-7'>{content}</p>
            <div className='flex space-x-1 justify-end'>
                {
                  cancelButton && <Buttonv2 name={cancelButtonName} color={cancelButtonColor} textColor='text-black' onClick={handleButtonClick}/>
                }
                <Buttonv2 type={confirmButtonType} href={href} name={confirmButtonName} color={confirmButtonColor} icon={confirmButtonIcon} onClick={()=>{handleButtonClick(); onConfirm();}}/>
            </div>
          </>
          :
          <>
            <div className='flex flex-col items-center'>
               <div className='w-28 h-28 md:w-36 md:h-36'>
                  <Lottie loop={false} animationData={
                    isOpen 
                      ? modalType === 'success' 
                        ? SuccessAnim 
                        : modalType === 'error' 
                        ? ErrorAnim 
                        : modalType === 'warning' 
                        ? WarningAnim 
                        : null 
                      : null
                  } className='w-full h-full'/>
               </div>
              <p className="mt-5 text-black font-semibold text-lg text-center">{title}</p>
              <div className='text-sm text-gray-500 mt-5 text-center'>{content}</div>
            </div>
            <div className='flex space-x-1 mt-7 justify-center'>
             
              {
                <Buttonv2 name={infoButtonName} color={confirmButtonColor} textColor='text-white' onClick={()=>{handleButtonClick(); onConfirm();}}/>
              }
            </div>
          </>
        }
       
      </div>
    </div>
  )
}

export default Modalv2