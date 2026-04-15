import React from 'react';
import DropdownSelect from '../../Dropdown/Dropdown';
import { useTheme } from '../../../Context/ThemeContext';

const FilterFields = ({
  filterData,
  filters,
  handleType,
  handleDateChange,
  handleFilter,
  handleSorting,
  formatLabel,
  filterSearchOptions
}) => {
  const {theme} = useTheme();
  return (
    <div className="space-y-4 ">
      {filterData?.length > 0 &&
        Object.keys(filterData[0]).map((key, index) => (
          <div key={index} className="block lg:flex items-center gap-4 justify-center">
            <label className={`w-1/6 text-sm font-medium ${theme === 'bg-skin-black' ? ' text-gray-400' : ' text-gray-700'}`}>
              {formatLabel(key)}
            </label>
            <DropdownSelect
              placeholder="Select Operators Type"
              defaultSelect="Select Operator Type"
              options={filterSearchOptions.types}
              value={filters[key]?.type || ''}
              onChange={(e) => handleType(key, e.target.value)}
              extendClass="flex-start"
            />

            {filters[key]?.type === 'between' &&
            ['created_at', 'updated_at'].some((substring) => key.toLowerCase().includes(substring)) ? (
              <div className="flex items-center justify-center gap-4">
                <input
                  type="date"
                  name={`${key}_start`}
                  value={filters[key]?.value?.[0] || ''}
                  onChange={(e) => handleDateChange(key, 0, e.target.value)}
                  className={`${theme === 'bg-skin-black' ? theme+' text-gray-300' : 'bg-white'} px-[6px] py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-gray-500 focus:border-gray-500 text-sm`}
                />
                <input
                  type="date"
                  name={`${key}_end`}
                  value={filters[key]?.value?.[1] || ''}
                  onChange={(e) => handleDateChange(key, 1, e.target.value)}
                  className={`${theme === 'bg-skin-black' ? theme+' text-gray-300' : 'bg-white'} px-[7px] py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-gray-500 focus:border-gray-500 text-sm`}
                />
              </div>
            ) : (
              <input
                name={key}
                value={filters[key]?.value || ''}
                onChange={(e) => handleFilter(e, key)}
                className={`${theme === 'bg-skin-black' ? theme+' text-gray-300' : 'bg-white'} w-full lg:w-2/5 block px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-gray-500 focus:border-gray-500 text-sm`}
              />
            )}
            <DropdownSelect
              placeholder="Sorting"
              defaultSelect="**Sorting**"
              options={filterSearchOptions.sorting}
              value={filters[key]?.sort || ''}
              onChange={(e) => handleSorting(key, e.target.value)}
            />
          </div>
        ))}
    </div>
  );
};

export default FilterFields;
