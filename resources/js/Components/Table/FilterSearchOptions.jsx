const types = [
    {
        id: '=',
        name: 'Equal',
    },
    {
        id: 'like',
        name: 'LIKE',
    },
    {
        id: 'not like',
        name: 'NOT LIKE',
    },
    {
        id: 'in',
        name: 'IN',
    },
    {
        id: 'not in',
        name: 'NOT IN',
    },
    {
        id: 'between',
        name: 'BETWEEN',
    },
    {
        id: 'empty',
        name: 'BLANK OR EMPTY',
    }
];

const sorting = [
    {
        id: 'asc',
        name: 'ASCENDING',
    },
    {
        id: 'desc',
        name: 'DESCENDING',
    }
];

const FilterSearchOptions = { types, sorting };

export default FilterSearchOptions;
