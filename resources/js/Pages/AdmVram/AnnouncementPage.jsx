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
import WyswygTextEditor from '../../Components/Forms/WyswygTextEditor';
import Button from '../../Components/Table/Buttons/Button';
import RowAction from '../../Components/Table/RowAction';
import useThemeStyles from '../../Hooks/useThemeStyles';

const AnnouncementPage = ({ announcements, queryParams }) => {
    const {theme} = useTheme();
    const [loading, setLoading] = useState(false);
    const { textColor, primayActiveColor } = useThemeStyles(theme);
    
    return (
        <>
            <Head title="Announcements" />
                <ContentPanel>
                    <TopPanel>
                        <Button
                            href="announcement/add-announcement"
                            extendClass={(theme === 'bg-skin-white' ? primayActiveColor : theme)+" p-2"}
                            type="link"
                            fontColor={theme === 'bg-skin-white' ? 'text-white' : textColor}
                        >
                            <i className="fa fa-plus-circle"></i> Add
                            Announcement
                        </Button>
                        <div className='flex'>
                            <Filters />
                            <TableSearch queryParams={queryParams} />
                        </div>
                    </TopPanel>

                    <TableContainer data={announcements.data}>
                        <Thead>
                            <Row>
                                <TableHeader
                                    name="description"
                                    queryParams={queryParams}
                                    width="xl"
                                >
                                    Title
                                </TableHeader>

                                <TableHeader
                                    name="id_adm_users"
                                    queryParams={queryParams}
                                    width="lg"
                                >
                                    Message
                                </TableHeader>

                                <TableHeader
                                    name="created_at"
                                    queryParams={queryParams}
                                    width="xl"
                                >
                                    Status
                                </TableHeader>
                            </Row>
                        </Thead>
                        <Tbody data={announcements.data}>
                            {announcements &&
                                announcements.data.map((item) => (
                                    <Row key={item.id}>
                                        <RowData isLoading={loading}>
                                            {item.title}
                                        </RowData>
                                        <div style={{ paddingLeft: '20px' }}>
                                            <div 
                                                dangerouslySetInnerHTML={{ __html: item.message }} 
                                                style={{ listStyleType: 'disc' }}
                                            />
                                        </div>
                                        <RowData isLoading={loading}>
                                            {item.status}  
                                        </RowData>
                                        <RowData center>
                                            <RowAction
                                                as="button"
                                                action="edit"
                                                href={`announcement/edit-announcement/${item.id}`}
                                            ></RowAction>
                                        </RowData>
                                    </Row>
                                ))}
                        </Tbody>
                    </TableContainer>
                    <Pagination extendClass={theme} paginate={announcements} />
                </ContentPanel>
        </>
    );
};

export default AnnouncementPage;
