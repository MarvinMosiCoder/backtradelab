import React from 'react'
import TableButton from './TableButton'
import { useState } from 'react'
import { router, useForm } from '@inertiajs/react'
import { useToast } from '../../../Context/ToastContext'

const Import = ({importPath, templatePath, }) => {

  const {handleToast} =useToast();

  const [show, setShow] = useState(false);

  const { data, setData, post, progress, errors, reset, clearErrors  } = useForm({
    file: null,
  })

  const submit = (e) => {
    e.preventDefault()
    post(importPath, {
      forceFormData: true,  
      onSuccess: (data) => {
        const { status, message } = data.props.auth.sessions;
        handleShow();
        reset();
        handleToast(message, status);
      },
      onError: (data) => {
        const { status, message } = data.props.auth.sessions;
        handleShow();
        reset();
        handleToast(message, status);
      }
    });
  }
  
  const handleShow = () => {
    setShow(!show);
  }
  
  return (
    <>
    <TableButton onClick={handleShow}>Import</TableButton>
    {show && 
    <div  className='fixed inset-0 z-[51] font-poppins'>
      {/* modal backdrop  */}
      <div onClick={handleShow} className='bg-black/50 h-full w-full'></div>
      {/* modal content  */}
      <div className='h-[230px] w-[500px] fixed z-[52] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-gray-100 rounded-md px-5 py-5 flex flex-col gap-4'>
        <header className='flex items-center justify-between '>
          <h1 className='text-xl font-bold'>Import File</h1>
          <a className='underline underline-offset-2 cursor-pointer' href={templatePath}>Download Template</a>
        </header>

        <form className='flex flex-col h-full gap-2'  onSubmit={submit}>
          <div className='flex-1 flex flex-col justify-center gap-1'>
            <span className="sr-only">Choose import file</span>
             <input id='file' type="file" onChange={e => setData('file', e.target.files[0])}  className="block w-full text-sm text-slate-500
                file:mr-4 file:py-2 file:px-4
                file:rounded-full file:border-0
                file:text-sm file:font-semibold
                file:bg-primary file:text-gray-200
                border-2 rounded-full border-primary/10 file:cursor-pointer cursor-pointer
              "/>
            {errors.file && <span className='ml-2 text-red-400 font-medium'><em>{errors.file}</em></span>}

          </div>

          {/* Buttons */}
          <div className='h-10 flex gap-4 justify-center items-center text-sm'>
            <button className='py-2 px-4 bg-primary border-[0.1px] border-primary text-white rounded-md' type="submit">Import</button>
            <button onClick={()=>{handleShow(); reset(); clearErrors();}} className='py-2 px-4 bg-gray-100 border-[0.1px] border-primary text-gray-900 rounded-md' type="button">Cancel</button>
          </div>
        </form>
      </div>
    </div>
    }
    </>
  )
}

export default Import
