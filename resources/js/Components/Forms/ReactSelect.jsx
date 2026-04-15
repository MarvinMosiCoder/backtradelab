import React, { useState } from "react";
import FormatLabelName from "../../Utilities/FormatLabelName";
import Select2 from 'react-select';

const ReactSelect = ({
    name,
    value,
    onChange,
    placeholder,
    displayName,
    options,
    menuPlacement = "bottom"
}) => {
    return (
        <div className="">
            <label
                htmlFor={name}
                className="block text-sm font-bold text-gray-700 font-poppins"
            >
                {displayName || FormatLabelName(name)}
            </label>

            <Select2
                maxMenuHeight={'150px'}
                minMenuHeight={'100px'}
                menuPlacement={menuPlacement}
                styles={customStyles}
                placeholder={placeholder}
                value={value}
                name={name}
                className="text-sm"
                onChange={onChange}
                options={options}
            />
        </div>
    );
};

const customStyles = {
    control: (provided, state) => ({
      ...provided,
      marginTop: '0.25rem',
      width: '100%', 
      padding: '1px', 
      borderWidth: '1px', 
      borderColor: '#D1D5DB', 
      borderStyle: 'solid',
      borderRadius: '0.375rem', 
      boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)', 
      fontSize: '0.875rem', 
      color: '#4B5563', 
      outline: 'none',
      '&:hover': {
        borderColor: '#9CA3AF', 
      },
    }),
    singleValue: (provided) => ({
      ...provided,
      color: '#4B5563', 
      fontSize: '0.875rem',
    }),
    placeholder: (provided) => ({
      ...provided,
      color: '#9CA3AF', 
      fontSize: '0.875rem', 
    }),
    indicatorSeparator: () => ({
      display: 'none',
    }),
  };

export default ReactSelect;

