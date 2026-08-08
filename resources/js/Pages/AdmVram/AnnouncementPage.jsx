import React, { useState } from 'react';
import { Head, router } from '@inertiajs/react';
import axios from 'axios';
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
import { useTheme } from '../../Context/ThemeContext';
import Filters from '../../Components/Table/Buttons/Filters';
import Button from '../../Components/Table/Buttons/Button';
import RowActions from '../../Components/Table/RowActions';
import RowAction from '../../Components/Table/RowAction';
import useThemeStyles from '../../Hooks/useThemeStyles';
import useSwalColor from '../../Hooks/useThemeSwalColor';
import { useToast } from '../../Context/ToastContext';

const AnnouncementPage = ({ announcements, queryParams }) => {
    const { theme } = useTheme();
    const [loading, setLoading] = useState(false);
    const { textColor, primayActiveColor } = useThemeStyles(theme);
    const swalColor = useSwalColor(theme);
    const { handleToast } = useToast();

    const handleDelete = (id) => {
        Swal.fire({
            title: '<p class="font-poppins">Delete this announcement?</p>',
            text: 'This cannot be undone.',
            showCancelButton: true,
            confirmButtonText: 'Delete',
            confirmButtonColor: '#dc2626',
            icon: 'warning',
            iconColor: swalColor,
            reverseButtons: true,
        }).then(async (result) => {
            if (!result.isConfirmed) return;
            try {
                const response = await axios.post(`/announcements/delete-announcement/${id}`);
                if (response.data.status == 'success') {
                    handleToast(response.data.message, response.data.status);
                    router.reload();
                }
            } catch (error) {}
        });
    };

    return (
        <>
            <Head title="Announcements" />
                <ContentPanel>
                    <TopPanel>
                        <Button
                            href="/announcements/add-announcement"
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
                                    name="title"
                                    queryParams={queryParams}
                                    width="lg"
                                >
                                    Title
                                </TableHeader>

                                <TableHeader
                                    name="message"
                                    queryParams={queryParams}
                                    sortable={false}
                                    width="xl"
                                >
                                    Message
                                </TableHeader>

                                <TableHeader
                                    name="status"
                                    queryParams={queryParams}
                                    width="sm"
                                >
                                    Status
                                </TableHeader>

                                <TableHeader
                                    name="actions"
                                    sortable={false}
                                    width="sm"
                                    justify="center"
                                >
                                    Actions
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
                                        <RowData isLoading={loading}>
                                            {item.excerpt}
                                        </RowData>
                                        <RowData isLoading={loading}>
                                            {item.status}
                                        </RowData>
                                        <RowData center>
                                            <RowActions>
                                                <RowAction
                                                    as="button"
                                                    action="edit"
                                                    href={`/announcements/edit-announcement/${item.id}`}
                                                />
                                                <RowAction
                                                    type="button"
                                                    action="delete"
                                                    onClick={() => handleDelete(item.id)}
                                                />
                                            </RowActions>
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
