import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { Plus, Trash2, Edit2, ChevronLeft, Clock, FileText, Tag, Loader2 } from 'lucide-react';

import { Button } from "../components/ui/button"
import { Input } from "../components/ui/input"
import { Label } from "../components/ui/label"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../components/ui/dialog"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card"
import { toast } from "sonner"

const Topics = () => {
    const navigate = useNavigate();
    const [topics, setTopics] = useState([]);
    const [loading, setLoading] = useState(true);

    // Dialog State
    const [showModal, setShowModal] = useState(false);
    const [editingTopic, setEditingTopic] = useState(null); // null = creating new

    // Form State
    const [formData, setFormData] = useState({
        title: '',
        durationMinutes: 30, // Default 30 min
        description: ''
    });

    useEffect(() => {
        fetchTopics();
    }, []);

    const fetchTopics = async () => {
        try {
            const res = await api.get('/topics/mine');
            setTopics(res.data);
        } catch (err) {
            console.error(err);
            toast.error("Fehler beim Laden der Themen.");
        } finally {
            setLoading(false);
        }
    };

    const handleOpenModal = (topic = null) => {
        if (topic) {
            setEditingTopic(topic);
            setFormData({
                title: topic.title,
                durationMinutes: topic.durationMinutes,
                description: topic.description || ''
            });
        } else {
            setEditingTopic(null);
            setFormData({
                title: '',
                durationMinutes: 30,
                description: ''
            });
        }
        setShowModal(true);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        try {
            if (editingTopic) {
                await api.put(`/topics/${editingTopic.id}`, formData);
                toast.success("Thema erfolgreich aktualisiert.");
            } else {
                await api.post('/topics', formData);
                toast.success("Neues Thema erstellt.");
            }
            setShowModal(false);
            fetchTopics();
        } catch (err) {
            console.error(err);
            toast.error("Fehler beim Speichern: " + (err.response?.data?.error || err.message));
        }
    };

    const handleDelete = async (id) => {
        if (!confirm("Thema wirklich löschen?")) return;
        try {
            await api.delete(`/topics/${id}`);
            toast.success("Thema gelöscht.");
            fetchTopics();
        } catch (err) {
            console.error(err);
            toast.error("Fehler beim Löschen.");
        }
    };

    if (loading) return <div className="flex justify-center items-center h-[50vh]"><Loader2 className="animate-spin text-primary" size={32} /></div>;

    return (
        <div className="max-w-5xl mx-auto space-y-8 animate-fade-in-up pb-20">
            {/* Header */}
            <div>
                <Button variant="ghost" onClick={() => navigate('/dashboard')} className="pl-0 text-muted-foreground hover:text-primary mb-4">
                    <ChevronLeft className="mr-2 h-4 w-4" />
                    Zurück zum Dashboard
                </Button>
                <div className="flex justify-between items-end">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-foreground">Themen & Leistungen</h1>
                        <p className="text-muted-foreground mt-1">Definieren Sie die Gesprächsthemen und deren Dauer, die gebucht werden können.</p>
                    </div>
                    <Button onClick={() => handleOpenModal(null)} className="gap-2">
                        <Plus size={16} /> Neues Thema
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {topics.map(topic => (
                    <Card key={topic.id} className="group hover:border-primary/50 transition-all shadow-sm">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-lg flex justify-between items-start">
                                {topic.title}
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    {topic.batchConfigId ? (
                                        <div title="Vom Admin verwaltet - kann nicht gelöscht werden" className="p-2 text-muted-foreground/50 cursor-not-allowed">
                                            <Trash2 size={14} />
                                        </div>
                                    ) : (
                                        <>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" onClick={() => handleOpenModal(topic)}>
                                                <Edit2 size={14} />
                                            </Button>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => handleDelete(topic.id)}>
                                                <Trash2 size={14} />
                                            </Button>
                                        </>
                                    )}
                                </div>
                            </CardTitle>
                            <CardDescription className="flex items-center gap-2">
                                <Clock size={14} /> {topic.durationMinutes} Minuten
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-muted-foreground line-clamp-3">
                                {topic.description || <span className="italic opacity-50">Keine Beschreibung</span>}
                            </p>
                        </CardContent>
                    </Card>
                ))}
                {topics.length === 0 && (
                    <div className="col-span-full py-16 text-center border-2 border-dashed border-muted rounded-xl bg-muted/20">
                        <p className="text-muted-foreground">Noch keine Themen angelegt.</p>
                        <Button variant="link" className="mt-2 text-primary" onClick={() => handleOpenModal(null)}>
                            Erstes Thema anlegen
                        </Button>
                    </div>
                )}
            </div>

            {/* Dialog */}
            <Dialog open={showModal} onOpenChange={setShowModal}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>{editingTopic ? 'Thema bearbeiten' : 'Neues Thema erstellen'}</DialogTitle>
                        <DialogDescription>
                            Legen Sie fest, wie lange dieser Termin dauert und worum es geht.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSave} className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="title">Titel</Label>
                            <div className="relative">
                                <Tag className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
                                <Input
                                    id="title"
                                    className="pl-9"
                                    placeholder="z.B. Strategiegespräch"
                                    value={formData.title}
                                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                                    required
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="duration">Dauer (Minuten)</Label>
                            <div className="relative">
                                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
                                <Input
                                    id="duration"
                                    type="number"
                                    className="pl-9"
                                    min="5"
                                    step="5"
                                    value={formData.durationMinutes}
                                    onChange={e => setFormData({ ...formData, durationMinutes: parseInt(e.target.value) })}
                                    required
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="description">Beschreibung (Optional)</Label>
                            <div className="relative">
                                <FileText className="absolute left-3 top-3 text-muted-foreground h-4 w-4" />
                                <textarea
                                    id="description"
                                    className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 pl-9"
                                    placeholder="Kurze Beschreibung für den Kunden..."
                                    value={formData.description}
                                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setShowModal(false)}>Abbrechen</Button>
                            <Button type="submit">{editingTopic ? 'Speichern' : 'Erstellen'}</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default Topics;
