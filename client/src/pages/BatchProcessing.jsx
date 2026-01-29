import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Trash2, Users, Plus, ArrowLeft, Tags, Clock, Settings, Pencil } from 'lucide-react';
import { toast } from 'sonner';

const BatchProcessing = () => {
    const navigate = useNavigate();
    const [batches, setBatches] = useState([]);
    const [users, setUsers] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [loading, setLoading] = useState(true);

    // Form State
    const [isEditing, setIsEditing] = useState(false);
    const [editId, setEditId] = useState(null);

    const [name, setName] = useState('');
    const [type, setType] = useState('topic'); // 'topic' or 'availability'
    const [targetType, setTargetType] = useState('user'); // 'user' or 'department'
    const [selectedUsers, setSelectedUsers] = useState([]); // Used for Users OR Departments IDs
    const [applyToFuture, setApplyToFuture] = useState(false);

    // Topic Config
    const [topicConfig, setTopicConfig] = useState({ title: '', durationMinutes: '30', description: '' });

    // Availability Config
    const [availConfig, setAvailConfig] = useState({
        type: 'weekly',
        dayOfWeek: '1', // Monday
        startTime: '09:00',
        endTime: '17:00'
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [batchRes, userRes, deptRes] = await Promise.all([
                api.get('/admin/batch'),
                api.get('/admin/users'),
                api.get('/admin/departments')
            ]);
            setBatches(batchRes.data);
            setUsers(userRes.data);
            setDepartments(deptRes.data);
        } catch (err) {
            console.error(err);
            toast.error("Fehler beim Laden der Daten");
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setIsEditing(false);
        setEditId(null);
        setName('');
        setType('topic');
        setTargetType('user');
        setTopicConfig({ title: '', durationMinutes: '30', description: '' });
        setAvailConfig({ type: 'weekly', dayOfWeek: '1', startTime: '09:00', endTime: '17:00' });
        setSelectedUsers([]);
        setApplyToFuture(false);
    };

    const handleCreateOrUpdate = async () => {
        if (!name) return toast.error("Bitte einen Namen vergeben");
        if (selectedUsers.length === 0 && !applyToFuture) return toast.error("Bitte mindestens einen Eintrag wählen oder 'Zukünftige' aktivieren");

        const configData = type === 'topic' ? topicConfig : availConfig;

        // Prepare payload
        const payload = {
            name,
            type,
            targetType,
            configData,
            applyToFuture
        };

        if (targetType === 'user') {
            payload.userIds = selectedUsers;
        } else {
            payload.departmentIds = selectedUsers;
        }

        try {
            if (isEditing) {
                await api.put(`/admin/batch/${editId}`, payload);
                toast.success("Regel aktualisiert");
            } else {
                await api.post('/admin/batch', payload);
                toast.success("Regel erfolgreich erstellt");
            }
            fetchData();
            resetForm();
        } catch (err) {
            console.error(err);
            toast.error("Fehler beim Speichern");
        }
    };

    const handleEdit = (batch) => {
        setIsEditing(true);
        setEditId(batch.id);
        setName(batch.name);
        setType(batch.type);
        setTargetType(batch.targetType || 'user'); // Default to user if not set
        setApplyToFuture(batch.applyToFuture);

        if (batch.type === 'topic') {
            setTopicConfig(batch.configData);
        } else {
            setAvailConfig(batch.configData);
        }

        // Load selections based on Target Type
        if (batch.targetType === 'department') {
            // We need to know which departments are selected. 
            // The backend GET /batch returns `userIds` for user mode, but we updated it to include Departments.
            // But we need to update GET /batch to return Departments too? Yes or rely on payload logic.
            // Let's assume we need to update state correctly. 
            // For now, let's assume `batch.Departments` is present if we updated GET /batch
            if (batch.Departments) {
                setSelectedUsers(batch.Departments.map(d => d.id));
            } else {
                setSelectedUsers([]);
            }
        } else {
            setSelectedUsers(batch.userIds || []);
        }
    };

    const handleDelete = async (id) => {
        if (!confirm("Regel wirklich löschen? Dies entfernt auch alle zugehörigen Einträge bei den Benutzern!")) return;
        try {
            await api.delete(`/admin/batch/${id}`);
            toast.success("Regel gelöscht");
            setBatches(batches.filter(b => b.id !== id));
            if (isEditing && editId === id) resetForm();
        } catch (err) {
            console.error(err);
            toast.error("Fehler beim Löschen");
        }
    };

    const toggleSelection = (id) => {
        setSelectedUsers(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const selectAll = () => {
        const source = targetType === 'user' ? users : departments;
        if (selectedUsers.length === source.length) setSelectedUsers([]);
        else setSelectedUsers(source.map(x => x.id));
    };

    const selectAllUsers = () => {
        if (selectedUsers.length === users.length) setSelectedUsers([]);
        else setSelectedUsers(users.map(u => u.id));
    };

    return (
        <div className="animate-fade-in-up space-y-8 pb-20">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}>
                    <ArrowLeft className="h-4 w-4" />
                </Button>
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Sammelverarbeitung</h1>
                    <p className="text-muted-foreground">Erstellen Sie zentrale Regeln für Themen und Verfügbarkeiten.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left: Create Form */}
                <Card className="lg:col-span-2">
                    <CardHeader>
                        <CardTitle>{isEditing ? 'Regel bearbeiten' : 'Neue Regel erstellen'}</CardTitle>
                        <CardDescription>
                            {isEditing
                                ? 'Änderungen werden auf alle verknüpften Einträge angewendet.'
                                : 'Definieren Sie eine Vorlage und weisen Sie diese Benutzern zu.'}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="space-y-2">
                            <Label>Name der Regel (intern)</Label>
                            <Input placeholder="z.B. Standard-Themen Vertrieb" value={name} onChange={e => setName(e.target.value)} />
                        </div>

                        <Tabs value={type} onValueChange={isEditing ? undefined : setType} className="w-full">
                            <TabsList className="grid w-full grid-cols-2">
                                <TabsTrigger value="topic" disabled={isEditing && type !== 'topic'}>Thema & Leistung</TabsTrigger>
                                <TabsTrigger value="availability" disabled={isEditing && type !== 'availability'}>Verfügbarkeit</TabsTrigger>
                            </TabsList>
                            <TabsContent value="topic" className="space-y-4 border rounded-md p-4 mt-2">
                                <div className="space-y-2">
                                    <Label>Titel (öffentlich)</Label>
                                    <Input
                                        placeholder="z.B. Erstgespräch"
                                        value={topicConfig.title}
                                        onChange={e => setTopicConfig({ ...topicConfig, title: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Dauer (Minuten)</Label>
                                    <Input
                                        type="number"
                                        value={topicConfig.durationMinutes}
                                        onChange={e => setTopicConfig({ ...topicConfig, durationMinutes: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Beschreibung (optional)</Label>
                                    <Input
                                        placeholder="Kurze Beschreibung..."
                                        value={topicConfig.description || ''}
                                        onChange={e => setTopicConfig({ ...topicConfig, description: e.target.value })}
                                    />
                                </div>
                            </TabsContent>
                            <TabsContent value="availability" className="space-y-4 border rounded-md p-4 mt-2">
                                <Tabs value={availConfig.type} onValueChange={v => setAvailConfig({ ...availConfig, type: v, dayOfWeek: '1', specificDate: '' })} className="w-full">
                                    <TabsList className="grid w-full grid-cols-2 mb-4">
                                        <TabsTrigger value="weekly">Wöchentlich</TabsTrigger>
                                        <TabsTrigger value="specific_date">Bestimmtes Datum</TabsTrigger>
                                    </TabsList>

                                    <TabsContent value="weekly" className="space-y-4">
                                        <div className="space-y-2">
                                            <Label>Wochentag</Label>
                                            <Select
                                                value={availConfig.dayOfWeek.toString()}
                                                onValueChange={v => setAvailConfig({ ...availConfig, dayOfWeek: v })}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="1">Montag</SelectItem>
                                                    <SelectItem value="2">Dienstag</SelectItem>
                                                    <SelectItem value="3">Mittwoch</SelectItem>
                                                    <SelectItem value="4">Donnerstag</SelectItem>
                                                    <SelectItem value="5">Freitag</SelectItem>
                                                    <SelectItem value="6">Samstag</SelectItem>
                                                    <SelectItem value="0">Sonntag</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </TabsContent>

                                    <TabsContent value="specific_date" className="space-y-4">
                                        <div className="space-y-2">
                                            <Label>Datum</Label>
                                            <Input
                                                type="date"
                                                value={availConfig.specificDate || ''}
                                                onChange={e => setAvailConfig({ ...availConfig, specificDate: e.target.value })}
                                            />
                                        </div>
                                    </TabsContent>
                                </Tabs>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Von</Label>
                                        <Input
                                            type="time"
                                            value={availConfig.startTime}
                                            onChange={e => setAvailConfig({ ...availConfig, startTime: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Bis</Label>
                                        <Input
                                            type="time"
                                            value={availConfig.endTime}
                                            onChange={e => setAvailConfig({ ...availConfig, endTime: e.target.value })}
                                        />
                                    </div>
                                </div>
                            </TabsContent>
                        </Tabs>

                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label>Zuweisen an</Label>
                                <Tabs value={targetType} onValueChange={isEditing ? undefined : (v) => { setTargetType(v); setSelectedUsers([]); }} className="w-full">
                                    <TabsList className="grid w-full grid-cols-2">
                                        <TabsTrigger value="user" disabled={isEditing && targetType !== 'user'}>Einzelne Benutzer</TabsTrigger>
                                        <TabsTrigger value="department" disabled={isEditing && targetType !== 'department'}>Abteilungen</TabsTrigger>
                                    </TabsList>
                                </Tabs>
                            </div>

                            <div className="flex items-center justify-between">
                                <Label>{targetType === 'user' ? 'Benutzer auswählen' : 'Abteilungen auswählen'}</Label>
                                <Button variant="ghost" size="sm" onClick={selectAll}>Alle auswählen</Button>
                            </div>

                            <div className="border rounded-md p-4 h-48 overflow-y-auto space-y-2">
                                {targetType === 'user' ? (
                                    users.map(u => (
                                        <div key={u.id} className="flex items-center space-x-2">
                                            <Checkbox
                                                id={`u-${u.id}`}
                                                checked={selectedUsers.includes(u.id)}
                                                onCheckedChange={() => toggleSelection(u.id)}
                                            />
                                            <Label htmlFor={`u-${u.id}`} className="cursor-pointer flex-1">
                                                {u.displayName} <span className="text-muted-foreground text-xs">({u.username})</span>
                                            </Label>
                                        </div>
                                    ))
                                ) : (
                                    departments.map(d => (
                                        <div key={d.id} className="flex items-center space-x-2">
                                            <Checkbox
                                                id={`d-${d.id}`}
                                                checked={selectedUsers.includes(d.id)}
                                                onCheckedChange={() => toggleSelection(d.id)}
                                            />
                                            <Label htmlFor={`d-${d.id}`} className="cursor-pointer flex-1 flex items-center gap-2">
                                                <span>{d.name}</span>
                                                <span className="text-muted-foreground text-xs bg-muted px-1.5 rounded-full">
                                                    {d.Users ? d.Users.length : 0} Nutzer
                                                </span>
                                            </Label>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        <div className="flex items-center space-x-2 border p-4 rounded-md bg-muted/20">
                            <Checkbox
                                id="future"
                                checked={applyToFuture}
                                onCheckedChange={(c) => setApplyToFuture(c)}
                            />
                            <div className="grid gap-1.5 leading-none">
                                <Label htmlFor="future" className="cursor-pointer font-semibold">
                                    {targetType === 'user' ? 'Auch für zukünftige Benutzer anwenden' : 'Automatisch synchronisieren'}
                                </Label>
                                <p className="text-sm text-muted-foreground">
                                    {targetType === 'user'
                                        ? 'Wenn aktiv, erhalten neu erstellte Benutzer diese Regel automatisch.'
                                        : 'Neue Mitglieder der Abteilung erhalten die Regel, verlassende verlieren sie.'}
                                </p>
                            </div>
                        </div>

                        <div className="flex gap-4">
                            {isEditing && (
                                <Button variant="outline" className="w-full" onClick={resetForm}>Abbrechen</Button>
                            )}
                            <Button className="w-full" onClick={handleCreateOrUpdate}>
                                {isEditing ? 'Änderungen speichern' : 'Regel erstellen & anwenden'}
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Right: Existing Rules */}
                <div className="space-y-4">
                    <h3 className="text-xl font-semibold">Aktive Regeln</h3>
                    {batches.length === 0 && <p className="text-muted-foreground">Keine Regeln definiert.</p>}
                    {batches.map(batch => (
                        <Card key={batch.id} className={`transition-all ${editId === batch.id ? 'border-primary ring-1 ring-primary' : ''}`}>
                            <CardHeader className="pb-2">
                                <div className="flex justify-between items-start">
                                    <div className="flex items-center gap-2">
                                        <div className={`p-2 rounded-lg ${batch.type === 'topic' ? 'bg-amber-100 text-amber-700' : 'bg-violet-100 text-violet-700'}`}>
                                            {batch.type === 'topic' ? <Tags size={16} /> : <Clock size={16} />}
                                        </div>
                                        <div>
                                            <CardTitle className="text-base">{batch.name}</CardTitle>
                                        </div>
                                    </div>
                                    <div className="flex gap-1">
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" onClick={() => handleEdit(batch)}>
                                            <Pencil size={16} />
                                        </Button>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => handleDelete(batch.id)}>
                                            <Trash2 size={16} />
                                        </Button>
                                    </div>
                                </div>
                                <CardDescription className="flex items-center gap-2 pt-1">
                                    {batch.targetType === 'department' && (
                                        <span className="inline-flex items-center text-blue-600 font-medium text-xs bg-blue-50 px-2 py-0.5 rounded-full">
                                            Abteilung
                                        </span>
                                    )}
                                    {batch.applyToFuture && (
                                        <span className="inline-flex items-center text-emerald-600 font-medium text-xs bg-emerald-50 px-2 py-0.5 rounded-full">
                                            {batch.targetType === 'department' ? 'Auto-Sync' : 'Autom. für Neue'}
                                        </span>
                                    )}
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="text-sm text-muted-foreground pb-4">
                                {batch.type === 'topic' ? (
                                    <div className="space-y-1">
                                        <div className="font-medium text-foreground">{batch.configData.title}</div>
                                        <div className="flex justify-between">
                                            <span>{batch.configData.durationMinutes} Min</span>
                                            {batch.configData.description && <span className="opacity-70 truncate max-w-[150px]">{batch.configData.description}</span>}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-1">
                                        <div className="font-medium text-foreground">
                                            {batch.configData.type === 'specific_date'
                                                ? `Datum: ${batch.configData.specificDate}`
                                                : `Jeden ${['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'][batch.configData.dayOfWeek || 0]}`
                                            }
                                        </div>
                                        <div>{batch.configData.startTime} - {batch.configData.endTime}</div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default BatchProcessing;
