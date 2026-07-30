import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Switch } from "../components/ui/switch";
import { ChevronLeft, Camera, Loader2, Save, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

const Profile = () => {
    const { user, setUser } = useAuth();
    const navigate = useNavigate();

    const [formData, setFormData] = useState({
        displayName: '',
        email: '',
        position: '',
        location: '',
        showEmail: true,
        profileImage: '',
        departmentId: '',
        bookingPageActive: false
    });

    const [departments, setDepartments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploadingImage, setUploadingImage] = useState(false);

    useEffect(() => {
        const loadProfileData = async () => {
            try {
                // Fetch public departments and fresh profile details in parallel
                const [deptRes, meRes] = await Promise.all([
                    api.get('/public/departments'),
                    api.get('/auth/me')
                ]);

                setDepartments(deptRes.data);
                const currentUserData = meRes.data;
                setUser(currentUserData);

                const currentDeptId = currentUserData.Departments && currentUserData.Departments.length > 0
                    ? currentUserData.Departments[0].id.toString()
                    : '';

                setFormData({
                    displayName: currentUserData.displayName || '',
                    email: currentUserData.email || '',
                    position: currentUserData.position || '',
                    location: currentUserData.location || '',
                    showEmail: currentUserData.showEmail !== false,
                    profileImage: currentUserData.profileImage || '',
                    departmentId: currentDeptId,
                    bookingPageActive: currentUserData.bookingPageActive === true
                });
            } catch (err) {
                console.error("Failed to load profile data", err);
                toast.error("Fehler beim Laden der Profildaten.");
            } finally {
                setLoading(false);
            }
        };

        loadProfileData();
    }, []);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSwitchChange = (name, checked) => {
        setFormData(prev => ({ ...prev, [name]: checked }));
    };

    const handleImageUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (file.size > 2 * 1024 * 1024) {
            toast.error("Das Bild ist zu groß (max. 2MB).");
            return;
        }

        setUploadingImage(true);
        const uploadData = new FormData();
        uploadData.append('image', file);

        try {
            const res = await api.post('/auth/upload-image', uploadData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setFormData(prev => ({ ...prev, profileImage: res.data.path }));
            toast.success("Bild erfolgreich hochgeladen.");
        } catch (err) {
            console.error("Image upload failed", err);
            toast.error(err.response?.data?.error || "Fehler beim Bild-Upload.");
        } finally {
            setUploadingImage(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);

        try {
            const res = await api.put('/auth/profile', formData);
            if (res.data.success) {
                setUser(res.data.user);
                toast.success("Profil erfolgreich aktualisiert.");
            }
        } catch (err) {
            console.error("Profile update failed", err);
            toast.error(err.response?.data?.error || "Fehler beim Speichern des Profils.");
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center p-12">
                <Loader2 className="animate-spin text-primary h-8 w-8" />
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto space-y-6 animate-fade-in-up pb-20">
            <div>
                <Button variant="ghost" onClick={() => navigate('/dashboard')} className="pl-0 text-muted-foreground hover:text-primary mb-4">
                    <ChevronLeft className="mr-2 h-4 w-4" />
                    Zurück zum Dashboard
                </Button>
                <h1 className="text-3xl font-bold tracking-tight text-foreground">Mein Profil</h1>
                <p className="text-muted-foreground mt-1">Verwalte deine persönlichen Informationen, Kontaktdaten und Zuordnungen.</p>
            </div>

            <form onSubmit={handleSubmit}>
                <Card>
                    <CardHeader>
                        <CardTitle>Profil Details</CardTitle>
                        <CardDescription>Diese Angaben werden auf der öffentlichen Übersichtsseite für Bucher angezeigt.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {/* Profile Image Row */}
                        <div className="flex flex-col sm:flex-row items-center gap-6 pb-6 border-b">
                            <div className="relative group">
                                <div className="w-24 h-24 rounded-full overflow-hidden bg-muted border-2 border-primary/20 flex items-center justify-center">
                                    {formData.profileImage ? (
                                        <img src={formData.profileImage} alt="Profilbild" className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="text-2xl font-bold text-muted-foreground">
                                            {formData.displayName.charAt(0) || user?.username.charAt(0)}
                                        </div>
                                    )}
                                </div>
                                <label className="absolute bottom-0 right-0 p-1.5 bg-primary text-primary-foreground rounded-full cursor-pointer shadow hover:bg-primary/95 transition-all">
                                    {uploadingImage ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
                                    <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} disabled={uploadingImage} />
                                </label>
                            </div>
                            <div className="space-y-1 text-center sm:text-left">
                                <h3 className="font-semibold text-lg">{formData.displayName || user?.username}</h3>
                                <p className="text-sm text-muted-foreground">Lade ein Foto von dir hoch. Empfohlen: Quadratisch, max. 2MB.</p>
                            </div>
                        </div>

                        {/* Name and Email */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="displayName">Anzeigename</Label>
                                <Input
                                    id="displayName"
                                    name="displayName"
                                    required
                                    value={formData.displayName}
                                    onChange={handleInputChange}
                                    placeholder="z.B. Dr. Max Mustermann"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="email">E-Mail-Adresse (Nicht änderbar)</Label>
                                <Input
                                    id="email"
                                    name="email"
                                    type="email"
                                    disabled
                                    value={formData.email}
                                    className="bg-muted"
                                    placeholder="max@beispiel.de"
                                />
                            </div>
                        </div>

                        {/* Position and Location */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="position">Position / Funktion</Label>
                                <Input
                                    id="position"
                                    name="position"
                                    value={formData.position}
                                    onChange={handleInputChange}
                                    placeholder="z.B. Klassenlehrer, IT-Admin"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="location">Ort / Raum</Label>
                                <Input
                                    id="location"
                                    name="location"
                                    value={formData.location}
                                    onChange={handleInputChange}
                                    placeholder="z.B. Raum A104"
                                />
                            </div>
                        </div>

                        {/* Department selection */}
                        <div className="space-y-2">
                            <Label htmlFor="departmentId">Abteilung</Label>
                            <select
                                id="departmentId"
                                name="departmentId"
                                value={formData.departmentId}
                                onChange={handleInputChange}
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                <option value="">Keine Abteilung zugeordnet</option>
                                {departments.map(dept => (
                                    <option key={dept.id} value={dept.id.toString()}>{dept.name}</option>
                                ))}
                            </select>
                            <p className="text-xs text-muted-foreground">Durch die Zuordnung zu einer Abteilung erhältst du automatisch die dort verknüpften Standardthemen und Arbeitszeiten.</p>
                        </div>

                        {/* Show Email toggle */}
                        <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/20">
                            <div className="space-y-0.5">
                                <Label className="text-base">E-Mail-Adresse veröffentlichen</Label>
                                <p className="text-sm text-muted-foreground">Falls aktiv, wird deine E-Mail-Adresse auf der öffentlichen Profilseite angezeigt.</p>
                            </div>
                            <Switch
                                checked={formData.showEmail}
                                onCheckedChange={checked => handleSwitchChange('showEmail', checked)}
                            />
                        </div>

                        {/* Booking Page Active toggle */}
                        <div className="flex items-center justify-between p-4 rounded-lg border border-primary/20 bg-primary/5 animate-pulse-subtle">
                            <div className="space-y-0.5">
                                <Label className="text-base font-semibold">Buchungsseite aktivieren</Label>
                                <p className="text-sm text-muted-foreground">Aktiviere diese Option, damit andere Personen Termine bei dir buchen können. Standard für neue Benutzer ist deaktiviert.</p>
                            </div>
                            <Switch
                                checked={formData.bookingPageActive}
                                onCheckedChange={checked => handleSwitchChange('bookingPageActive', checked)}
                            />
                        </div>
                    </CardContent>
                    <CardFooter className="flex justify-end gap-2 border-t pt-6">
                        <Button type="submit" disabled={saving} className="gap-2">
                            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            Profil speichern
                        </Button>
                    </CardFooter>
                </Card>
            </form>
        </div>
    );
};

export default Profile;
