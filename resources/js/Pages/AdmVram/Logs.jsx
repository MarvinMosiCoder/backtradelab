import React, { useState } from 'react';
import { Head } from '@inertiajs/react';
import ContentPanel from '../../Components/Table/ContentPanel';
import TopPanel from '../../Components/Table/TopPanel';
import TableSearch from '../../Components/Table/TableSearch';
import Export from '../../Components/Table/Buttons/Export';
import TableContainer from '../../Components/Table/TableContainer';
import Thead from '../../Components/Table/Thead';
import Row from '../../Components/Table/Row';
import TableHeader from '../../Components/Table/TableHeader';
import Tbody from '../../Components/Table/Tbody';
import RowData from '../../Components/Table/RowData';
import Pagination from '../../Components/Table/Pagination';
import moment from 'moment';
import { useTheme } from '../../Context/ThemeContext';
import Filters from '../../Components/Table/Buttons/Filters';

const Logs = ({ logs, queryParams }) => {
    const {theme} = useTheme();
    const [loading, setLoading] = useState(false);
    return (
        <>
            <Head title="Log User Access" />
                <ContentPanel>
                    <TopPanel>
                        <div className="inline-flex gap-3">
                            <Export path="" />
                        </div>
                        <div className='flex'>
                            <Filters />
                            <TableSearch queryParams={queryParams} />
                        </div>
                    </TopPanel>

                    <TableContainer data={logs.data}>
                        <Thead>
                            <Row>
                                <TableHeader
                                    name="ipaddress"
                                    queryParams={queryParams}
                                    width="md"
                                >
                                    IP Address
                                </TableHeader>

                                <TableHeader
                                    name="useragent"
                                    queryParams={queryParams}
                                    width="xl"
                                >
                                    User Agent
                                </TableHeader>

                                <TableHeader
                                    name="url"
                                    queryParams={queryParams}
                                    width="xl"
                                >
                                    Url
                                </TableHeader>

                                <TableHeader
                                    name="description"
                                    queryParams={queryParams}
                                    width="xl"
                                >
                                    Description
                                </TableHeader>

                                <TableHeader
                                    name="id_adm_users"
                                    queryParams={queryParams}
                                    width="lg"
                                >
                                    User
                                </TableHeader>

                                <TableHeader
                                    name="created_at"
                                    queryParams={queryParams}
                                    width="xl"
                                >
                                    Log Date
                                </TableHeader>
                            </Row>
                        </Thead>
                        <Tbody data={logs.data}>
                            {logs &&
                                logs.data.map((item) => (
                                    <Row key={item.id}>
                                        <RowData isLoading={loading}>
                                            {item.ipaddress}
                                        </RowData>
                                        <RowData isLoading={loading}>
                                            {item.useragent}
                                        </RowData>
                                        <RowData isLoading={loading}>
                                            {item.url}
                                        </RowData>
                                        <RowData isLoading={loading}>
                                            {item.description}
                                        </RowData>
                                        <RowData isLoading={loading}>
                                            {item.user.name}
                                        </RowData>
                                        <RowData isLoading={loading}>
                                            {moment(item.created_at).format(
                                                "YYYY-MM-DD HH:mm:ss"
                                            )}
                                        </RowData>
                                    </Row>
                                ))}
                        </Tbody>
                    </TableContainer>
                    <Pagination extendClass={theme} paginate={logs} />
                </ContentPanel>
        </>
    );
};

export default Logs;
