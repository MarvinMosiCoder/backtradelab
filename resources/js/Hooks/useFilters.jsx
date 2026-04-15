import { useState } from 'react';
import { router } from '@inertiajs/react';

const useFilters = (path) => {
    const [filters, setFilters] = useState([]);

    // Handles filter updates for value or sort
    const handleFilter = (e, attrName) => {
        const { name, value } = e.target;

        setFilters((prevFilters) => ({
            ...prevFilters,
            [attrName || name]: {
                ...prevFilters[attrName || name],
                value, // Update only the value
            },
        }));
    };

    const handleSorting = (name, sort) => {
        setFilters((prevFilters) => ({
            ...prevFilters,
            [name]: {
                ...prevFilters[name],
                sort, // Update only the sort key
            },
        }));
    };

    const handleType = (name, type) => {
        setFilters((prevFilters) => ({
            ...prevFilters,
            [name]: {
                ...prevFilters[name],
                type, // Update only the sort key
            },
        }));
    };

    const handleDateChange = (key, index, date) => {
        setFilters((prevFilters) => {
            const currentValues = prevFilters[key]?.value || ['', '']; // Default to an empty array
            currentValues[index] = date; // Update the specific date (start or end)
    
            return {
                ...prevFilters,
                [key]: {
                    ...prevFilters[key],
                    value: currentValues, // Update the value array
                },
            };
        });
    };

    const handleFilterSubmit = (e, basePath = path) => {
        e.preventDefault();

        const queryParams = { filter_column: {} };
       
        // Serialize `filter_column` into query parameters
        Object.keys(filters).forEach((key) => {
            const filter = filters[key];
            if (filter?.type) {
                queryParams[`filter_column[${key}][type]`] = filter.type || '';
            }
            if (filter?.value) {
                if (filter.type === 'between') {   
                    filter.value.forEach((val, index) => {
                        queryParams[`filter_column[${key}][value][${index}]`] = val || '';
                    });
                }else {
                    queryParams[`filter_column[${key}][value]`] = filter.value || '';
                }
            }
            if (filter?.sort) {
                queryParams[`filter_column[${key}][sort]`] = filter.sort || '';
            }
            
        });

        // Add additional parameters (e.g., search, page)
        if (filters.search) {
            queryParams.search = filters.search;
        }
        if (filters.page) {
            queryParams.page = filters.page;
        }
    
        const queryString = new URLSearchParams(queryParams).toString();

        router.get(`${basePath}?${queryString}`);
    };

    return {
        filters,
        setFilters,
        handleFilter,
        handleSorting,
        handleFilterSubmit,
        handleType,
        handleDateChange
    };
};

export default useFilters;
