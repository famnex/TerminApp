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
import { Building2, Users as UsersIcon } from 'lucide-react';

const AdminUserList = () => {
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
        profileImage: ''
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
            profileImage: ''
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
            profileImage: userToEdit.profileImage || ''
        });
    };

    if (loading && !users.length) return <div className="flex justify-center p-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>;

    const isLdap = formData.authMethod === 'ldap';

    return (
        <div className="max-w-6xl mx-auto space-y-8 animate-fade-in-up pb-20">
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
                    <Card>
                        <CardHeader>
                            <CardTitle>Alle Benutzer</CardTitle>
                            <CardDescription>
                                Eine Übersicht aller registrierten Benutzer im System.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-[300px]">Benutzer</TableHead>
                                        <TableHead>Email</TableHead>
                                        <TableHead>Rolle</TableHead>
                                        <TableHead>Auth Methode</TableHead>
                                        <TableHead className="text-right">Aktionen</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {users.map((u) => (
                                        <TableRow key={u.id} className="group">
                                            <TableCell className="font-medium">
                                                <div className="flex items-center gap-3">
                                                    {u.profileImage ? (
                                                        <img src={u.profileImage} alt={u.displayName} className="w-10 h-10 rounded-full object-cover border" />
                                                    ) : (
                                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold ${u.isAdmin ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600'}`}>
                                                            {u.username.substring(0, 2).toUpperCase()}
                                                        </div>
                                                    )}
                                                    <div className="flex flex-col">
                                                        <span>{u.displayName}</span>
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-xs text-muted-foreground font-mono">@{u.username}</span>
                                                            {u.position && <span className="text-xs bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">{u.position}</span>}
                                                        </div>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col">
                                                    <span>{u.email || <span className="text-muted-foreground italic">Keine Email</span>}</span>
                                                    {!u.showEmail && u.email && <span className="text-[10px] text-orange-600 flex items-center gap-0.5"><EyeOff className="w-3 h-3" /> Versteckt</span>}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium border ${u.isAdmin ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-slate-50 text-slate-700 border-slate-200'}`}>
                                                    {u.isAdmin ? <Shield className="mr-1 h-3 w-3" /> : <User className="mr-1 h-3 w-3" />}
                                                    {u.isAdmin ? 'Administrator' : 'Benutzer'}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <span className="font-mono text-xs text-muted-foreground uppercase">{u.authMethod}</span>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-2">
                                                    <Button variant="ghost" size="icon" onClick={() => openEditModal(u)}>
                                                        <Edit2 className="h-4 w-4" />
                                                    </Button>
                                                    {u.authMethod === 'local' && (
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                                            onClick={() => handleDelete(u.id)}
                                                        >
                                                            <Trash className="h-4 w-4" />
                                                        </Button>
                                                    )}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
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
                                    <Card key={dept.id}>
                                        <CardHeader className="pb-2">
                                            <div className="flex justify-between items-start">
                                                <CardTitle className="text-base">{dept.name}</CardTitle>
                                                <div className="flex gap-1">
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
                            </CardContent>
                            <CardFooter className="flex justify-end gap-2">
                                <Button type="button" variant="outline" onClick={() => setShowCreateModal(false)}>Abbrechen</Button>
                                <Button type="submit">Erstellen</Button>
                            </CardFooter>
                        </form>
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
                                        <Label>Anzeigename {isLdap && <span className="text-xs text-muted-foreground">(Gesperrt durch LDAP)</span>}</Label>
                                        <Input
                                            name="displayName"
                                            required
                                            value={formData.displayName}
                                            onChange={handleInputChange}
                                            disabled={isLdap}
                                            className={isLdap ? "bg-muted" : ""}
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label>Email {isLdap && <span className="text-xs text-muted-foreground">(Gesperrt durch LDAP)</span>}</Label>
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
