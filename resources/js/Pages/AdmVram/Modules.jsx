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
import Modal from '../../Components/Modal/Modal';
import ModulForm from './ModulForm';
import Tbody from '../../Components/Table/Tbody';
import { useTheme } from '../../Context/ThemeContext';
import Filters from '../../Components/Table/Buttons/Filters';
import useThemeStyles from '../../Hooks/useThemeStyles';

const Modules = ({ modules, queryParams }) => {
    const {theme} = useTheme();
    queryParams = queryParams || {};
    router.on('start', () => setLoading(true));
    router.on('finish', () => setLoading(false));
    const [loading, setLoading] = useState(false);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const { textColor, primayActiveColor, textColorActive } = useThemeStyles(theme);

    // CREATE MODULES
    const handleCreate = () => {
        setShowCreateModal(true);
    };
    const handleCloseCreateModal = () => {
        setShowCreateModal(false);
        router.reload({ only: ['modules'] });
    };

    return (
        <>
            <Head title="Modules" />
                <ContentPanel>
                    <TopPanel>
                        <div className="inline-flex gap-3">
                            <TableButton extendClass={theme === 'bg-skin-white' ? primayActiveColor : theme+ ' py-[5px] px-[10px]'} fontColor={textColorActive} onClick={handleCreate}>
                                <i className="fa fa-plus-circle"></i> Add Modules
                            </TableButton>
                        </div>
                        <div className='flex'>
                            <Filters />
                            <TableSearch queryParams={queryParams} />
                        </div>
                    </TopPanel>
                    <TableContainer data={modules?.data}>
                        <Thead>
                            <Row>
                                <TableHeader
                                    name="id"
                                    queryParams={queryParams}
                                    width="sm"
                                >
                                    ID
                                </TableHeader>
                                <TableHeader
                                    name="name"
                                    queryParams={queryParams}
                                    width="sm"
                                >
                                    Name
                                </TableHeader>
                                <TableHeader
                                    name="is_superadmin"
                                    queryParams={queryParams}
                                    width="sm"
                                >
                                    Path
                                </TableHeader>
                                <TableHeader
                                    name="is_superadmin"
                                    queryParams={queryParams}
                                    width="sm"
                                >
                                    Controller
                                </TableHeader>
                                {/* <TableHeader
                                    sortable={false}
                                    width="auto"
                                    justify="center"
                                >
                                    Action
                                </TableHeader> */}
                            </Row>
                        </Thead>

                        <Tbody data={modules?.data}>
                            {modules &&
                                modules?.data.map((item, index) => (
                                    <Row key={item.id}>
                                        <RowData isLoading={loading}>
                                            {item.id}
                                        </RowData>
                                        <RowData isLoading={loading}>
                                            {item.name}
                                        </RowData>
                                        <RowData isLoading={loading}>
                                            {item.path}
                                        </RowData>
                                        <RowData isLoading={loading}>
                                            {item.controller}
                                        </RowData>
                                        {/* <RowData center>
                                            <RowAction action="edit" 
                                                    href={`edit-module/${item.id}`}                                                                              
                                            >
                                                
                                            </RowAction>
                                        </RowData> */}
                                    </Row>
                                ))}
                        </Tbody>
                    </TableContainer>
                    <Pagination extendClass={theme} paginate={modules} />
                </ContentPanel>
                <Modal
                    theme={theme}
                    show={showCreateModal}
                    onClose={handleCloseCreateModal}
                    title="Create Module"
                    fontColor={textColorActive}
                >
                    <ModulForm onClose={handleCloseCreateModal} />
                </Modal>
        </>
    );
};

export default Modules;
