import React from 'react'
import DescIcon from '../Table/Icons/DescIcon';
import FormatLabelName from '../../Utilities/FormatLabelName';

const Select = ({ options, onChange, value, name, displayName }) => {

  return (
    <div>
        <label htmlFor={name} className='block text-sm font-bold text-gray-700 font-poppins'>{displayName || FormatLabelName(name)}</label>


        <div className="relative mt-1">
            <select id={name} name={name} value={value} onChange={onChange} className="appearance-none p-2 text-sm outline-none border border-gray-300 rounded-lg bg-white w-full cursor-pointer">
            <option value="" >Select {displayName || FormatLabelName(name)} </option>
            {options.map((option, index) => (
                <option key={index} value={option.id}>
                {option.name}
                </option>
            ))}
            </select>
            
            <span className="absolute top-1/2 right-5 -translate-y-1/2   pointer-events-none">
                <DescIcon/>
            </span>
        </div>
    </div>
  )
}



export default Select