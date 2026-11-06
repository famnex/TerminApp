import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../components/ui/dialog';
import NameBadge from '../components/NameBadge';
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import { User, Shield, Key, Mail, Edit2, Plus, ChevronLeft, Trash, LayoutList, Eye, EyeOff, Upload } from 'lucide-react';

import { Button } from "../components/ui/button"
import { Input } from "../components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "../components/ui/card"
import { Switch } from "../components/ui/switch"
import { Label } from "../components/ui/label"
import { Checkbox } from "../components/ui/checkbox"
import {
    Table,
    TableBody,
    TableCaption,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "../components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Building2, Users as UsersIcon, Star, GitMerge, AlertTriangle, Loader2, Search, X, Calendar, Clock, CheckCircle2, Phone } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';
import { toast } from 'sonner';

const AdminUserList = () => {
    const [badgeUser, setBadgeUser] = useState(null);
    const [users, setUsers] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Modal State
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showDeptModal, setShowDeptModal] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [editingDept, setEditingDept] = useState(null);
    const [uploadingImage, setUploadingImage] = useState(false);
    const [duplicateGroups, setDuplicateGroups] = useState([]);
    const [merging, setMerging] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedUserForBookings, setSelectedUserForBookings] = useState(null);
    const [userBookings, setUserBookings] = useState([]);
    const [loadingUserBookings, setLoadingUserBookings] = useState(false);
    const [bookingStatusFilter, setBookingStatusFilter] = useState('all'); // 'all', 'past', 'upcoming', 'cancelled'

    const openUserBookingsModal = async (u) => {
        setSelectedUserForBookings(u);
        setLoadingUserBookings(true);
        setBookingStatusFilter('all');
        try {
            const res = await api.get(`/admin/users/${u.id}/bookings`);
            setUserBookings(res.data);
        } catch (err) {
            console.error('Failed to load user bookings', err);
            toast.error('Fehler beim Laden der Termine');
            setUserBookings([]);
        } finally {
            setLoadingUserBookings(false);
        }
    };

    const closeUserBookingsModal = () => {
        setSelectedUserForBookings(null);
        setUserBookings([]);
    };

    // Department Form State
    const [deptFormData, setDeptFormData] = useState({
        name: '',
        description: '',
        userIds: []
    });

    // User Form State
    const [formData, setFormData] = useState({
        username: '',
        password: '',
        displayName: '',
        email: '',
        isAdmin: false,
        authMethod: 'local',
        position: '',
        location: '',
        showEmail: true,
        profileImage: '',
        bookingPageActive: false
    });

    const navigate = useNavigate();
    const { user } = useAuth();

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const [usersRes, deptsRes] = await Promise.all([
                api.get('/admin/users'),
                api.get('/admin/departments')
            ]);
            setUsers(usersRes.data);
            setDepartments(deptsRes.data);
            try {
                const dupRes = await api.get('/admin/users-duplicates');
                setDuplicateGroups(Array.isArray(dupRes.data) ? dupRes.data : []);
            } catch (dupErr) {
                console.error("Failed to fetch duplicates", dupErr);
                setDuplicateGroups([]);
            }
            setError(null);
        } catch (err) {
            console.error("Failed to fetch data", err);
            setError("Fehler beim Laden der Daten.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (user?.isAdmin) {
            fetchUsers();
        } else {
            navigate('/dashboard');
        }
    }, [user, navigate]);

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleDeptSortUser = (userId) => {
        setDeptFormData(prev => {
            const current = prev.userIds || [];
            if (current.includes(userId)) {
                return { ...prev, userIds: current.filter(id => id !== userId) };
            } else {
                return { ...prev, userIds: [...current, userId] };
            }
        });
    }

    const handleSwitchChange = (name, checked) => {
        setFormData(prev => ({ ...prev, [name]: checked }));
    };

    const resetForm = () => {
        setFormData({
            username: '',
            password: '',
            displayName: '',
            email: '',
            isAdmin: false,
            authMethod: 'local',
            position: '',
            location: '',
            showEmail: true,
            profileImage: '',
            bookingPageActive: false
        });
        setDeptFormData({ name: '', description: '', userIds: [] });
        setError(null);
    };

    const handleCreateSubmit = async (e) => {
        e.preventDefault();
        try {
            await api.post('/admin/users', formData);
            setShowCreateModal(false);
            resetForm();
            fetchUsers();
        } catch (err) {
            setError(err.response?.data?.error || 'Fehler beim Erstellen.');
        }
    };

    const handleDeptSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingDept) {
                await api.put(`/admin/departments/${editingDept.id}`, deptFormData);
            } else {
                await api.post('/admin/departments', deptFormData);
            }
            setShowDeptModal(false);
            setEditingDept(null);
            resetForm();
            fetchUsers();
        } catch (err) {
            setError(err.response?.data?.error || 'Fehler beim Speichern der Abteilung.');
        }
    };

    const handleDeleteDept = async (id) => {
        if (!confirm("Abteilung wirklich löschen?")) return;
        try {
            await api.delete(`/admin/departments/${id}`);
            fetchUsers();
        } catch (err) {
            setError(err.response?.data?.error || 'Fehler beim Löschen.');
        }
    };

    const handleToggleDefaultDept = async (dept) => {
        try {
            const res = await api.put(`/admin/departments/${dept.id}/default`);
            if (res.data.isDefault) {
                toast.success(`"${dept.name}" ist jetzt die Standardabteilung für neue Benutzer.`);
            } else {
                toast.info(`"${dept.name}" ist nicht mehr als Standardabteilung markiert.`);
            }
            fetchUsers();
        } catch (err) {
            setError(err.response?.data?.error || 'Fehler beim Festlegen der Standardabteilung.');
        }
    };

    const openDeptModal = (dept = null) => {
        if (dept) {
            setEditingDept(dept);
            setDeptFormData({
                name: dept.name,
                description: dept.description || '',
                userIds: dept.Users ? dept.Users.map(u => u.id) : []
            });
        } else {
            setEditingDept(null);
            setDeptFormData({ name: '', description: '', userIds: [] });
        }
        setShowDeptModal(true);
    };

    const handleEditSubmit = async (e) => {
        e.preventDefault();
        try {
            const updateData = { ...formData };
            if (!updateData.password) delete updateData.password;

            await api.put(`/admin/users/${editingUser.id}`, updateData);
            setEditingUser(null);
            resetForm();
            fetchUsers();
        } catch (err) {
            setError(err.response?.data?.error || 'Fehler beim Speichern.');
        }
    };

    const handleDelete = async (userId) => {
        if (!userId) return;
        if (!window.confirm("Bist du sicher, dass du diesen Benutzer unwiderruflich löschen möchtest?")) {
            return;
        }

        try {
            await api.delete(`/admin/users/${userId}`);
            fetchUsers();
        } catch (err) {
            setError(err.response?.data?.error || 'Fehler beim Löschen.');
            // Clear error after 5 seconds to avoid persistent error state
            setTimeout(() => setError(null), 5000);
        }
    };

    const handleMergeDuplicates = async () => {
        const accountCount = duplicateGroups.reduce((sum, g) => sum + g.users.length - 1, 0);
        if (!window.confirm(`Es werden ${duplicateGroups.length} Benutzer zusammengeführt und dabei ${accountCount} doppelte Konten entfernt.\n\nAlle Termine, Themen, Verfügbarkeiten, Abwesenheiten und Abteilungen werden in das jeweils markierte Hauptkonto übernommen. Vorher wird automatisch eine Sicherung der Datenbank angelegt.\n\nFortfahren?`)) {
            return;
        }
        setMerging(true);
        try {
            const res = await api.post('/admin/users-duplicates/merge');
            toast.success(`${res.data.mergedGroups} Benutzer zusammengeführt, ${res.data.removedAccounts} doppelte Konten entfernt.${res.data.backupPath ? ` Sicherung: ${res.data.backupPath}` : ''}`);
            fetchUsers();
        } catch (err) {
            toast.error(err.response?.data?.error || 'Fehler beim Zusammenführen.');
        } finally {
            setMerging(false);
        }
    };

    const handleImageUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const uploadData = new FormData();
        uploadData.append('image', file);

        setUploadingImage(true);
        try {
            const res = await api.post('/admin/upload-user-image', uploadData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setFormData(prev => ({ ...prev, profileImage: res.data.path }));
        } catch (err) {
            console.error("Upload failed", err);
            // Optionally set a specialized error or toast
        } finally {
            setUploadingImage(false);
        }
    };

    const openEditModal = (userToEdit) => {
        setEditingUser(userToEdit);
        setFormData({
            username: userToEdit.username,
            password: '',
            displayName: userToEdit.displayName,
            email: userToEdit.email || '',
            isAdmin: userToEdit.isAdmin,
            authMethod: userToEdit.authMethod || 'local',
            position: userToEdit.position || '',
            location: userToEdit.location || '',
            showEmail: userToEdit.showEmail !== false, // Default to true if undefined
            profileImage: userToEdit.profileImage || '',
            bookingPageActive: userToEdit.bookingPageActive === true
        });
    };

        const filteredUsers = (Array.isArray(users) ? users : [])
        .filter(u => {
            if (!searchTerm.trim()) return true;
            const term = searchTerm.toLowerCase();
            const matchesName = (u.displayName || '').toLowerCase().includes(term);
            const matchesUsername = (u.username || '').toLowerCase().includes(term);
            const matchesEmail = (u.email || '').toLowerCase().includes(term);
            const matchesPosition = (u.position || '').toLowerCase().includes(term);
            const matchesDept = u.Departments && u.Departments.some(d => (d.name || '').toLowerCase().includes(term));
            const totalBookings = u.bookingStats?.total || 0;
            const matchesBookings = (term === 'termine' || term === 'termin') 
                ? totalBookings > 0 
                : (term === 'keine termine' || term === '0 termine') 
                    ? totalBookings === 0 
                    : (totalBookings.toString() + ' termine').includes(term);
            return matchesName || matchesUsername || matchesEmail || matchesPosition || matchesDept || matchesBookings;
        })
        .sort((a, b) => 
            (a.displayName || '').localeCompare(b.displayName || '', 'de', { sensitivity: 'base' }) ||
            (a.username || '').localeCompare(b.username || '', 'de', { sensitivity: 'base' })
        );

    if (loading && !users.length) return <div className="flex justify-center p-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>;

    const isLdap = formData.authMethod === 'ldap' || formData.authMethod === 'sso';

    return (
        <div className="max-w-6xl mx-auto space-y-8 animate-fade-in-up pb-20">
            <Dialog open={!!badgeUser} onOpenChange={open => { if (!open) setBadgeUser(null); }}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader><DialogTitle>Namensschild für {badgeUser?.displayName}</DialogTitle><DialogDescription>Anrede und Zusatz wählen, anschließend drucken oder als PDF herunterladen.</DialogDescription></DialogHeader>
                    {badgeUser && <NameBadge key={badgeUser.id} userId={badgeUser.id} />}
                </DialogContent>
            </Dialog>
            {/* Header */}
            <div>
                <Button variant="ghost" onClick={() => navigate('/dashboard')} className="pl-0 text-muted-foreground hover:text-primary mb-6">
                    <ChevronLeft className="mr-2 h-4 w-4" />
                    Zurück zum Dashboard
                </Button>

                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-foreground">Benutzerverwaltung</h1>
                        <p className="text-muted-foreground mt-1">Verwalte Systemzugriffe und Berechtigungen.</p>
                    </div>
                    <Button onClick={() => { resetForm(); setShowCreateModal(true); }}>
                        <Plus className="mr-2 h-4 w-4" /> Benutzer erstellen
                    </Button>
                </div>
            </div>

            {error && <div className="p-4 bg-destructive/10 text-destructive rounded-md border border-destructive/20">{error}</div>}

            <Tabs defaultValue="users" className="w-full">
                <TabsList className="mb-4">
                    <TabsTrigger value="users" className="flex items-center gap-2">
                        <UsersIcon size={16} /> Benutzer ({users.length})
                    </TabsTrigger>
                    <TabsTrigger value="departments" className="flex items-center gap-2">
                        <Building2 size={16} /> Abteilungen ({departments.length})
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="users">
                    {duplicateGroups.length > 0 && (
                        <Card className="mb-6 border-amber-300 bg-amber-50/40">
                            <CardHeader className="pb-3">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                    <div>
                                        <CardTitle className="text-base flex items-center gap-2 text-amber-900">
                                            <AlertTriangle className="h-4 w-4 text-amber-600" />
                                            {duplicateGroups.length} {duplicateGroups.length === 1 ? 'Benutzer hat' : 'Benutzer haben'} doppelte Konten (LDAP / SSO)
                                        </CardTitle>
                                        <CardDescription className="text-amber-800/80 mt-1">
                                            Diese Konten haben dieselbe E-Mail-Adresse und gehören zur selben Person. Beim Zusammenführen werden alle Daten in das markierte Hauptkonto übernommen.
                                        </CardDescription>
                                    </div>
                                    <Button onClick={handleMergeDuplicates} disabled={merging} className="gap-2 shrink-0">
                                        {merging ? <Loader2 className="h-4 w-4 animate-spin" /> : <GitMerge className="h-4 w-4" />}
                                        Alle zusammenführen
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                {duplicateGroups.map(group => (
                                    <div key={group.email} className="rounded-md border border-amber-200 bg-background p-3">
                                        <div className="text-sm font-medium mb-2 flex items-center gap-2">
                                            <Mail className="h-3.5 w-3.5 text-muted-foreground" /> {group.email}
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            {group.users.map(du => (
                                                <div
                                                    key={du.id}
                                                    className={`text-xs rounded-md border px-2.5 py-1.5 ${du.isPrimary ? 'border-green-300 bg-green-50 text-green-900' : 'border-slate-200 bg-slate-50 text-slate-600'}`}
                                                >
                                                    <div className="font-medium flex items-center gap-1.5">
                                                        {du.isPrimary ? 'Hauptkonto' : 'Wird übernommen'} · <span className="font-mono">@{du.username}</span>
                                                        <span className="uppercase font-mono text-[10px] opacity-70">({du.authMethod})</span>
                                                    </div>
                                                    <div className="opacity-80 mt-0.5">
                                                        {du.bookings} Termine · {du.topics} Themen · {du.availabilities} Verfügbarkeiten · {du.timeOffs} Abwesenheiten
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </CardContent>
                        </Card>
                    )}
                    <Card>
                        <CardHeader className="space-y-4">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div>
                                    <CardTitle>Alle Benutzer</CardTitle>
                                    <CardDescription>
                                        Eine Übersicht aller registrierten Benutzer im System (alphabetisch sortiert).
                                    </CardDescription>
                                </div>
                                <div className="relative w-full sm:w-80">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        placeholder="Suchen nach Name, Email, Position..."
                                        className="pl-9 pr-8 h-9"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                    {searchTerm && (
                                        <button
                                            type="button"
                                            onClick={() => setSearchTerm('')}
                                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5"
                                            title="Suche leeren"
                                        >
                                            <X className="h-3.5 w-3.5" />
                                        </button>
                                    )}
                                </div>
                            </div>
                            {searchTerm && (
                                <div className="text-xs text-muted-foreground flex items-center justify-between pt-1 border-t">
                                    <span>Gefiltert: <strong>{filteredUsers.length}</strong> von {users.length} Benutzern</span>
                                    <button 
                                        type="button" 
                                        onClick={() => setSearchTerm('')} 
                                        className="text-primary hover:underline text-xs"
                                    >
                                        Alle anzeigen
                                    </button>
                                </div>
                            )}
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-[30%] min-w-[200px]">Benutzer</TableHead>
                                        <TableHead className="min-w-[150px]">Email</TableHead>
                                        <TableHead className="w-[120px]">Rolle</TableHead>
                                        <TableHead className="w-[80px]">Auth</TableHead>
                                        <TableHead className="w-[110px]">Buchungsseite</TableHead>
                                        <TableHead className="w-[70px] text-center">Termine</TableHead>
                                        <TableHead className="w-[90px] text-right">Aktionen</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredUsers.map((u) => (
                                        <TableRow key={u.id} className="group">
                                            <TableCell className="font-medium py-3">
                                                <div className="flex items-center gap-3">
                                                    {u.profileImage ? (
                                                        <img src={u.profileImage} alt={u.displayName} className="w-9 h-9 rounded-full object-cover border shrink-0" />
                                                    ) : (
                                                        <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${u.isAdmin ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600'}`}>
                                                            {u.username.substring(0, 2).toUpperCase()}
                                                        </div>
                                                    )}
                                                    <div className="flex flex-col min-w-0 max-w-[260px]">
                                                        <span className="truncate leading-snug">{u.displayName}</span>
                                                        <div className="flex flex-wrap items-center gap-1 mt-0.5">
                                                            <span className="text-xs text-muted-foreground font-mono">@{u.username}</span>
                                                            {u.position && u.position.split(',').map(s => s.trim()).filter(Boolean).map((pos, idx) => (
                                                                <span key={idx} className="text-[11px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-600 truncate max-w-[190px]" title={pos}>{pos}</span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell className="py-3">
                                                <div className="flex flex-col min-w-0">
                                                    <span className="text-sm truncate max-w-[190px]" title={u.email || ''}>
                                                        {u.email || <span className="text-muted-foreground italic">Keine Email</span>}
                                                    </span>
                                                    {!u.showEmail && u.email && (
                                                        <span className="text-[10px] text-orange-600 flex items-center gap-0.5 mt-0.5">
                                                            <EyeOff className="w-3 h-3" /> Versteckt
                                                        </span>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell className="py-3 whitespace-nowrap">
                                                <div className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border ${u.isAdmin ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-slate-50 text-slate-700 border-slate-200'}`}>
                                                    {u.isAdmin ? <Shield className="mr-1 h-3 w-3" /> : <User className="mr-1 h-3 w-3" />}
                                                    {u.isAdmin ? 'Administrator' : 'Benutzer'}
                                                </div>
                                            </TableCell>
                                            <TableCell className="py-3 whitespace-nowrap">
                                                <span className="font-mono text-xs text-muted-foreground uppercase">{u.authMethod}</span>
                                            </TableCell>
                                            <TableCell className="py-3 whitespace-nowrap">
                                                {u.bookingPageActive ? (
                                                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                                        <span className="h-1.5 w-1.5 rounded-full bg-green-500"></span>
                                                        Aktiv
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                                        <span className="h-1.5 w-1.5 rounded-full bg-red-500"></span>
                                                        Inaktiv
                                                    </span>
                                                )}
                                            </TableCell>
                                            <TableCell className="py-3 text-center whitespace-nowrap">
                                                <button
                                                    type="button"
                                                    onClick={() => openUserBookingsModal(u)}
                                                    className={`inline-flex items-center justify-center min-w-[28px] h-6 px-2 rounded-full text-xs font-semibold transition-colors cursor-pointer ${
                                                        u.bookingStats?.total > 0
                                                            ? 'bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200'
                                                            : 'text-muted-foreground bg-slate-50 hover:bg-slate-100 border border-slate-200'
                                                    }`}
                                                    title={`${u.bookingStats?.total || 0} Termine – Klicken für Details (stattgefunden, anstehend, storniert)`}
                                                >
                                                    {u.bookingStats?.total || 0}
                                                </button>
                                            </TableCell>
                                            <TableCell className="py-3 text-right whitespace-nowrap">
                                                <div className="flex justify-end gap-1">
                                                    <Button variant="outline" size="sm" onClick={() => setBadgeUser(u)}>Namensschild</Button>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditModal(u)} title="Benutzer bearbeiten">
                                                        <Edit2 className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                                        onClick={() => handleDelete(u.id)}
                                                        title="Benutzer löschen"
                                                    >
                                                        <Trash className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                {filteredUsers.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                                                {searchTerm ? (
                                                    <div className="space-y-2">
                                                        <p>Keine Benutzer für die Suche <strong>"{searchTerm}"</strong> gefunden.</p>
                                                        <Button variant="outline" size="sm" onClick={() => setSearchTerm('')}>
                                                            Suche zurücksetzen
                                                        </Button>
                                                    </div>
                                                ) : (
                                                    <p>Keine Benutzer vorhanden.</p>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="departments">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle>Abteilungen</CardTitle>
                                <CardDescription>Organisationseinheiten verwalten.</CardDescription>
                            </div>
                            <Button onClick={() => openDeptModal()}>
                                <Plus className="mr-2 h-4 w-4" /> Neu
                            </Button>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {departments.map(dept => (
                                    <Card key={dept.id} className={dept.isDefault ? "border-amber-400 bg-amber-50/20 shadow-sm" : ""}>
                                        <CardHeader className="pb-2">
                                            <div className="flex justify-between items-start">
                                                <div className="flex flex-col gap-1">
                                                    <CardTitle className="text-base flex items-center gap-2">
                                                        {dept.name}
                                                    </CardTitle>
                                                    {dept.isDefault && (
                                                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-700 bg-amber-100/80 px-2 py-0.5 rounded-full w-fit">
                                                            <Star size={11} className="fill-amber-500 text-amber-500" /> Standard für neue Benutzer
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex gap-1">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className={`h-6 w-6 ${dept.isDefault ? 'text-amber-500 hover:text-amber-600' : 'text-muted-foreground hover:text-amber-500'}`}
                                                        onClick={() => handleToggleDefaultDept(dept)}
                                                        title={dept.isDefault ? "Als Standardabteilung für neue Benutzer entfernen" : "Als Standardabteilung für neue Benutzer festlegen"}
                                                    >
                                                        <Star size={14} className={dept.isDefault ? "fill-amber-400 text-amber-500" : ""} />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => openDeptModal(dept)}>
                                                        <Edit2 size={14} />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => handleDeleteDept(dept.id)}>
                                                        <Trash size={14} />
                                                    </Button>
                                                </div>
                                            </div>
                                            <CardDescription>{dept.description || 'Keine Beschreibung'}</CardDescription>
                                        </CardHeader>
                                        <CardFooter className="pt-0 text-sm text-muted-foreground">
                                            <UsersIcon className="mr-2 h-4 w-4" />
                                            {dept.Users ? dept.Users.length : 0} Mitarbeiter
                                        </CardFooter>
                                    </Card>
                                ))}
                                {departments.length === 0 && <p className="text-muted-foreground col-span-full text-center py-8">Keine Abteilungen angelegt.</p>}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* DEPARTMENT MODAL */}
            {showDeptModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in zoom-in duration-200">
                    <Card className="w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
                        <CardHeader>
                            <CardTitle>{editingDept ? 'Abteilung bearbeiten' : 'Neue Abteilung'}</CardTitle>
                        </CardHeader>
                        <form onSubmit={handleDeptSubmit}>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label>Name</Label>
                                    <Input
                                        required
                                        value={deptFormData.name}
                                        onChange={e => setDeptFormData({ ...deptFormData, name: e.target.value })}
                                        placeholder="Marketing"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Beschreibung</Label>
                                    <Input
                                        value={deptFormData.description}
                                        onChange={e => setDeptFormData({ ...deptFormData, description: e.target.value })}
                                        placeholder="Zuständig für..."
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Mitarbeiter zuweisen</Label>
                                    <div className="border rounded-md p-2 h-48 overflow-y-auto space-y-2 bg-muted/20">
                                        {users.map(u => (
                                            <div key={u.id} className="flex items-center space-x-2 p-1 hover:bg-muted/50 rounded">
                                                <Checkbox
                                                    id={`dept-u-${u.id}`}
                                                    checked={(deptFormData.userIds || []).includes(u.id)}
                                                    onCheckedChange={() => handleDeptSortUser(u.id)}
                                                />
                                                <Label htmlFor={`dept-u-${u.id}`} className="flex-1 cursor-pointer flex items-center gap-2">
                                                    <span className="font-medium">{u.displayName}</span>
                                                    <span className="text-xs text-muted-foreground">({u.username})</span>
                                                </Label>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </CardContent>
                            <CardFooter className="flex justify-end gap-2">
                                <Button type="button" variant="outline" onClick={() => setShowDeptModal(false)}>Abbrechen</Button>
                                <Button type="submit">Speichern</Button>
                            </CardFooter>
                        </form>
                    </Card>
                </div>
            )}

            {/* CREATE MODAL */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in zoom-in duration-200">
                    <Card className="w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
                        <CardHeader>
                            <CardTitle>Neuen Benutzer erstellen</CardTitle>
                            <CardDescription>Füge einen neuen Administrator oder Mitarbeiter hinzu.</CardDescription>
                        </CardHeader>
                        <form onSubmit={handleCreateSubmit}>
                            <CardContent className="space-y-5">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Benutzername</Label>
                                        <Input name="username" required value={formData.username} onChange={handleInputChange} placeholder="jdoe" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Passwort</Label>
                                        <Input type="password" name="password" required value={formData.password} onChange={handleInputChange} />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label>Anzeigename</Label>
                                    <Input name="displayName" required value={formData.displayName} onChange={handleInputChange} placeholder="John Doe" />
                                </div>
                                <div className="space-y-2">
                                    <Label>Email</Label>
                                    <Input type="email" name="email" value={formData.email} onChange={handleInputChange} placeholder="john@example.com" />
                                </div>

                                <div className="pt-2 border-t">
                                    <h3 className="text-sm font-medium mb-3">Zusätzliche Informationen</h3>
                                    <div className="space-y-4">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label>Position / Funktion (Optional)</Label>
                                                <Input name="position" value={formData.position} onChange={handleInputChange} placeholder="z.B. Beratungslehrer" />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Ort / Raum (Optional)</Label>
                                                <Input name="location" value={formData.location} onChange={handleInputChange} placeholder="z.B. Raum 101" />
                                            </div>
                                        </div>

                                        <div className="flex items-center space-x-2">
                                            <Switch
                                                id="showEmailNew"
                                                checked={formData.showEmail}
                                                onCheckedChange={(c) => handleSwitchChange('showEmail', c)}
                                            />
                                            <Label htmlFor="showEmailNew">Email-Adresse öffentlich anzeigen</Label>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center space-x-2 pt-2 border-t">
                                    <input type="checkbox" id="isAdmin" name="isAdmin" checked={formData.isAdmin} onChange={handleInputChange} className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-600 h-4 w-4" />
                                    <label htmlFor="isAdmin" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Administrator-Rechte gewähren</label>
                                </div>
                                <div className="flex items-center space-x-2 pt-2">
                                    <input type="checkbox" id="bookingPageActive" name="bookingPageActive" checked={formData.bookingPageActive} onChange={handleInputChange} className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-600 h-4 w-4" />
                                    <label htmlFor="bookingPageActive" className="text-sm font-medium leading-none">Buchungsseite aktivieren</label>
                                </div>
                            </CardContent>
                            <CardFooter className="flex justify-end gap-2">
                                <Button type="button" variant="outline" onClick={() => setShowCreateModal(false)}>Abbrechen</Button>
                                <Button type="submit">Erstellen</Button>
                            </CardFooter>
                        </form>
                    </Card>
                </div>
            )}

            {/* USER BOOKINGS MODAL */}
            {selectedUserForBookings && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in zoom-in duration-200">
                    <Card className="w-full max-w-3xl shadow-2xl max-h-[90vh] flex flex-col">
                        <CardHeader className="border-b pb-4 shrink-0">
                            <div className="flex items-start justify-between">
                                <div>
                                    <CardTitle className="text-xl flex items-center gap-2">
                                        <Calendar className="h-5 w-5 text-primary" />
                                        Termine von {selectedUserForBookings.displayName}
                                    </CardTitle>
                                    <CardDescription className="mt-1">
                                        @{selectedUserForBookings.username} {selectedUserForBookings.email && `· ${selectedUserForBookings.email}`}
                                    </CardDescription>
                                </div>
                                <Button variant="ghost" size="icon" onClick={closeUserBookingsModal}>
                                    <X className="h-5 w-5" />
                                </Button>
                            </div>

                            {/* KPI Metrics */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-3">
                                <div 
                                    onClick={() => setBookingStatusFilter('all')}
                                    className={`p-2.5 rounded-lg border text-center cursor-pointer transition-all ${bookingStatusFilter === 'all' ? 'bg-primary/10 border-primary ring-1 ring-primary' : 'bg-muted/40 hover:bg-muted'}`}
                                >
                                    <div className="text-xs text-muted-foreground">Gesamt</div>
                                    <div className="text-lg font-bold text-foreground">{selectedUserForBookings.bookingStats?.total || 0}</div>
                                </div>
                                <div 
                                    onClick={() => setBookingStatusFilter('past')}
                                    className={`p-2.5 rounded-lg border text-center cursor-pointer transition-all ${bookingStatusFilter === 'past' ? 'bg-emerald-50 border-emerald-500 ring-1 ring-emerald-500' : 'bg-muted/40 hover:bg-muted'}`}
                                >
                                    <div className="text-xs text-muted-foreground">Stattgefunden</div>
                                    <div className="text-lg font-bold text-emerald-700">{selectedUserForBookings.bookingStats?.past || 0}</div>
                                </div>
                                <div 
                                    onClick={() => setBookingStatusFilter('upcoming')}
                                    className={`p-2.5 rounded-lg border text-center cursor-pointer transition-all ${bookingStatusFilter === 'upcoming' ? 'bg-blue-50 border-blue-500 ring-1 ring-blue-500' : 'bg-muted/40 hover:bg-muted'}`}
                                >
                                    <div className="text-xs text-muted-foreground">Anstehend</div>
                                    <div className="text-lg font-bold text-blue-700">{selectedUserForBookings.bookingStats?.upcoming || 0}</div>
                                </div>
                                <div 
                                    onClick={() => setBookingStatusFilter('cancelled')}
                                    className={`p-2.5 rounded-lg border text-center cursor-pointer transition-all ${bookingStatusFilter === 'cancelled' ? 'bg-amber-50 border-amber-500 ring-1 ring-amber-500' : 'bg-muted/40 hover:bg-muted'}`}
                                >
                                    <div className="text-xs text-muted-foreground">Storniert</div>
                                    <div className="text-lg font-bold text-amber-700">{selectedUserForBookings.bookingStats?.cancelled || 0}</div>
                                </div>
                            </div>
                        </CardHeader>

                        <CardContent className="p-0 overflow-y-auto flex-1">
                            {loadingUserBookings ? (
                                <div className="flex flex-col items-center justify-center p-12 text-muted-foreground">
                                    <Loader2 className="h-8 w-8 animate-spin mb-2 text-primary" />
                                    <p className="text-sm">Termine werden geladen...</p>
                                </div>
                            ) : userBookings.length === 0 ? (
                                <div className="flex flex-col items-center justify-center p-12 text-muted-foreground">
                                    <Calendar className="h-10 w-10 text-muted-foreground/40 mb-2" />
                                    <p className="font-medium text-foreground">Keine Termine vorhanden</p>
                                    <p className="text-xs mt-1">Über dieses System wurden für diesen Benutzer noch keine Termine gebucht.</p>
                                </div>
                            ) : (
                                <div className="divide-y">
                                    {userBookings
                                        .filter(b => {
                                            if (bookingStatusFilter === 'all') return true;
                                            if (bookingStatusFilter === 'cancelled') return b.status === 'cancelled';
                                            const isPast = new Date(b.slotStartTime) < new Date();
                                            if (bookingStatusFilter === 'past') return b.status === 'confirmed' && isPast;
                                            if (bookingStatusFilter === 'upcoming') return b.status === 'confirmed' && !isPast;
                                            return true;
                                        })
                                        .map(b => {
                                            const isPast = new Date(b.slotStartTime) < new Date();
                                            const isCancelled = b.status === 'cancelled';
                                            return (
                                                <div key={b.id} className="p-4 hover:bg-muted/20 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm">
                                                    <div className="space-y-1">
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-semibold text-foreground">
                                                                {b.Topic?.title || 'Termin'}
                                                            </span>
                                                            {isCancelled ? (
                                                                <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-red-100 text-red-800 border border-red-200">
                                                                    Storniert
                                                                </span>
                                                            ) : isPast ? (
                                                                <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-100 text-emerald-800 border border-emerald-200">
                                                                    Stattgefunden
                                                                </span>
                                                            ) : (
                                                                <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-blue-100 text-blue-800 border border-blue-200">
                                                                    Anstehend
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                                            <span className="flex items-center gap-1">
                                                                <Calendar className="h-3.5 w-3.5 text-primary" />
                                                                {format(parseISO(b.slotStartTime), "EEEE, d. MMMM yyyy 'um' HH:mm 'Uhr'", { locale: de })}
                                                            </span>
                                                            {b.Topic?.durationMinutes && (
                                                                <span className="flex items-center gap-1">
                                                                    <Clock className="h-3.5 w-3.5" />
                                                                    {b.Topic.durationMinutes} Min.
                                                                </span>
                                                            )}
                                                        </div>
                                                        {isCancelled && b.cancellationReason && (
                                                            <div className="text-xs text-red-700 bg-red-50 px-2 py-1 rounded border border-red-200 inline-block mt-1">
                                                                Grund: {b.cancellationReason}
                                                            </div>
                                                        )}
                                                    </div>

                                                    <div className="text-xs sm:text-right text-muted-foreground bg-muted/40 sm:bg-transparent p-2 sm:p-0 rounded">
                                                        <div className="font-medium text-foreground">{b.customerName || 'Kunde unbenannt'}</div>
                                                        {b.customerEmail && <div className="text-muted-foreground">{b.customerEmail}</div>}
                                                        {b.customerPhone && <div className="text-muted-foreground">{b.customerPhone}</div>}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                </div>
                            )}
                        </CardContent>

                        <CardFooter className="border-t p-3 justify-end shrink-0">
                            <Button variant="outline" onClick={closeUserBookingsModal}>
                                Schließen
                            </Button>
                        </CardFooter>
                    </Card>
                </div>
            )}

            {/* EDIT MODAL */}
            {editingUser && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in zoom-in duration-200">
                    <Card className="w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
                        <CardHeader>
                            <CardTitle>Benutzer bearbeiten</CardTitle>
                            <CardDescription>@{editingUser.username} {isLdap && <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">LDAP</span>}</CardDescription>
                        </CardHeader>
                        <form onSubmit={handleEditSubmit}>
                            <CardContent className="space-y-5">
                                {/* Profile Image Section */}
                                <div className="flex items-center gap-4 pb-4 border-b">
                                    <div className="relative h-16 w-16 rounded-full overflow-hidden bg-muted border">
                                        {formData.profileImage ? (
                                            <img src={formData.profileImage} alt="Profile" className="h-full w-full object-cover" />
                                        ) : (
                                            <div className="flex items-center justify-center h-full w-full bg-slate-100 text-slate-400">
                                                <User className="h-8 w-8" />
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex-1">
                                        <Label htmlFor="profileImage" className="cursor-pointer">
                                            <div className="flex items-center gap-2 text-sm text-primary hover:underline">
                                                <Upload className="h-4 w-4" />
                                                Profilbild hochladen
                                            </div>
                                            <input
                                                id="profileImage"
                                                type="file"
                                                className="hidden"
                                                accept="image/*"
                                                onChange={handleImageUpload}
                                                disabled={uploadingImage}
                                            />
                                        </Label>
                                        <p className="text-xs text-muted-foreground mt-1">Empfohlen: Quadratisch, max 2MB.</p>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <Label>Anzeigename {isLdap && <span className="text-xs text-muted-foreground">(Gesperrt durch {formData.authMethod?.toUpperCase()})</span>}</Label>
                                        <Input
                                            name="displayName"
                                            disabled={isLdap}
                                            className={isLdap ? "bg-muted" : ""}
                                            required
                                            value={formData.displayName}
                                            onChange={handleInputChange}
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label>Email {isLdap && <span className="text-xs text-muted-foreground">(Gesperrt durch {formData.authMethod?.toUpperCase()})</span>}</Label>
                                        <Input
                                            type="email"
                                            name="email"
                                            value={formData.email}
                                            onChange={handleInputChange}
                                            disabled={isLdap}
                                            className={isLdap ? "bg-muted" : ""}
                                        />
                                    </div>

                                    {!isLdap && (
                                        <div className="space-y-2">
                                            <Label>Neues Passwort (Optional)</Label>
                                            <Input type="password" name="password" placeholder="••••••••" value={formData.password} onChange={handleInputChange} />
                                        </div>
                                    )}
                                </div>

                                <div className="pt-2 border-t">
                                    <h3 className="text-sm font-medium mb-3">Zusätzliche Informationen</h3>
                                    <div className="space-y-4">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label>Position / Funktion</Label>
                                                <Input name="position" value={formData.position} onChange={handleInputChange} placeholder="z.B. Beratungslehrer" />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Ort / Raum (Optional)</Label>
                                                <Input name="location" value={formData.location} onChange={handleInputChange} placeholder="z.B. Raum 101" />
                                            </div>
                                        </div>

                                        <div className="flex items-center space-x-2">
                                            <Switch
                                                id="showEmailEdit"
                                                checked={formData.showEmail}
                                                onCheckedChange={(c) => handleSwitchChange('showEmail', c)}
                                            />
                                            <Label htmlFor="showEmailEdit">Email-Adresse öffentlich anzeigen</Label>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center space-x-2 pt-2 border-t">
                                    <input type="checkbox" id="editIsAdmin" name="isAdmin" checked={formData.isAdmin} onChange={handleInputChange} className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-600 h-4 w-4" />
                                    <label htmlFor="editIsAdmin" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Administrator-Rechte gewähren</label>
                                </div>
                                <div className="flex items-center space-x-2 pt-2">
                                    <input type="checkbox" id="editBookingPageActive" name="bookingPageActive" checked={formData.bookingPageActive} onChange={handleInputChange} className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-600 h-4 w-4" />
                                    <label htmlFor="editBookingPageActive" className="text-sm font-medium leading-none">Buchungsseite aktivieren</label>
                                </div>
                            </CardContent>
                            <CardFooter className="flex justify-end gap-2">
                                <Button type="button" variant="outline" onClick={() => setEditingUser(null)}>Abbrechen</Button>
                                <Button type="submit">Speichern</Button>
                            </CardFooter>
                        </form>
                    </Card>
                </div>
            )}
        </div>
    );
};

export default AdminUserList;
