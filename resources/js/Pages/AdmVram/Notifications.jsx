import { Head, router, usePage } from '@inertiajs/react';
import React, { useContext, useEffect, useState } from 'react';
import ContentPanel from '../../Components/Table/ContentPanel';
import TopPanel from '../../Components/Table/TopPanel';
import TableContainer from '../../Components/Table/TableContainer';
import Thead from '../../Components/Table/Thead';
import TableHeader from '../../Components/Table/TableHeader';
import Row from '../../Components/Table/Row';
import RowData from '../../Components/Table/RowData';
import TableSearch from '../../Components/Table/TableSearch';
import Pagination from '../../Components/Table/Pagination';
import TableButton from '../../Components/Table/Buttons/TableButton';
import Tbody from '../../Components/Table/Tbody';
import { useTheme } from '../../Context/ThemeContext';
import Filters from '../../Components/Table/Buttons/Filters';

const Notifications = ({ notifications, queryParams, page_title }) => {
    const {theme} = useTheme();
    queryParams = queryParams || {};
    const [loading, setLoading] = useState(false);
    console.log(notifications)
    return (
        <>
            <Head title={page_title} />
            <ContentPanel>
                <TopPanel>
                    <div className='flex'>
                        <Filters />
                        <TableSearch queryParams={queryParams} />
                    </div>
                </TopPanel>
                <TableContainer data={notifications?.data}>
                    <Thead>
                      <Row>
                        {notifications?.data?.length > 0 &&
                          Object.keys(notifications.data[0]).map((key, index) => (
                            <TableHeader
                              key={index}
                              name={key}
                              queryParams={queryParams}
                              width="sm"
                            >
                              {key}
                            </TableHeader>
                        ))}
                      </Row>
                    </Thead>

                    <Tbody data={notifications?.data}>
                        {notifications?.data?.map((item, rowIndex) => (
                          <Row key={rowIndex}>
                            {Object.keys(item).map((key, colIndex) => (
                              <RowData key={colIndex}>
                                {item[key] !== null ? item[key].toString() : "N/A"}
                              </RowData>
                            ))}
                          </Row>
                        ))}
                    </Tbody>
                </TableContainer>
                <Pagination extendClass={theme} paginate={notifications} />
            </ContentPanel>
        </>
    );
};

export default Notifications;
