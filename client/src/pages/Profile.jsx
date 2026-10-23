import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Switch } from "../components/ui/switch";
import { ChevronLeft, Camera, Loader2, Save, X } from "lucide-react";
import { toast } from "sonner";

const parsePositionItems = (posStr) => {
    if (!posStr) return [];
    return posStr
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);
};

const Profile = () => {
    const { user, setUser } = useAuth();
    const navigate = useNavigate();

    const [formData, setFormData] = useState({
        displayName: '',
        email: '',
        position: '',
        locationType: 'none', // 'none', 'room', 'custom', 'secretariat'
        roomNumber: '',
        customLocation: '',
        showEmail: true,
        profileImage: '',
        departmentId: '',
        bookingPageActive: false
    });

    const [positionItems, setPositionItems] = useState([]);
    const [positionInput, setPositionInput] = useState('');

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

                const rawLocation = (currentUserData.location || '').trim();
                let initialLocationType = currentUserData.locationType;

                // Migration fallback: empty = 'none', filled = 'custom'
                if (!initialLocationType) {
                    initialLocationType = rawLocation ? 'custom' : 'none';
                }

                let initialRoomNumber = '';
                let initialCustomLocation = '';

                if (initialLocationType === 'room') {
                    initialRoomNumber = rawLocation.replace(/^Raum\s+/i, '');
                } else if (initialLocationType === 'custom') {
                    initialCustomLocation = rawLocation;
                }

                const initialPositions = parsePositionItems(currentUserData.position || '');
                setPositionItems(initialPositions);
                setPositionInput('');

                setFormData({
                    displayName: currentUserData.displayName || '',
                    email: currentUserData.email || '',
                    position: initialPositions.join(', '),
                    locationType: initialLocationType,
                    roomNumber: initialRoomNumber,
                    customLocation: initialCustomLocation,
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

    const handlePositionKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const raw = positionInput.trim();
            if (!raw) return;

            const newParts = raw.split(',').map(s => s.trim()).filter(Boolean);
            setPositionItems(prev => {
                const updated = [...prev];
                newParts.forEach(part => {
                    if (!updated.includes(part)) {
                        updated.push(part);
                    }
                });
                return updated;
            });
            setPositionInput('');
        }
    };

    const handleRemovePosition = (indexToRemove) => {
        setPositionItems(prev => prev.filter((_, idx) => idx !== indexToRemove));
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

        // If user still has un-confirmed text in positionInput when clicking Save, include it
        let finalPositionItems = [...positionItems];
        if (positionInput.trim()) {
            const extraParts = positionInput.trim().split(',').map(s => s.trim()).filter(Boolean);
            extraParts.forEach(part => {
                if (!finalPositionItems.includes(part)) {
                    finalPositionItems.push(part);
                }
            });
            setPositionItems(finalPositionItems);
            setPositionInput('');
        }
        const finalPositionString = finalPositionItems.join(', ');

        let finalLocation = '';
        if (formData.locationType === 'room') {
            const num = (formData.roomNumber || '').trim();
            finalLocation = num ? (num.toLowerCase().startsWith('raum ') ? num : `Raum ${num}`) : '';
        } else if (formData.locationType === 'custom') {
            finalLocation = (formData.customLocation || '').trim();
        } else if (formData.locationType === 'secretariat') {
            finalLocation = 'Treffpunkt Sekretariat';
        } else {
            finalLocation = '';
        }

        try {
            const payload = {
                ...formData,
                position: finalPositionString,
                location: finalLocation,
                locationType: formData.locationType
            };
            const res = await api.put('/auth/profile', payload);
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

    const isExternalAuth = user?.authMethod === 'sso' || user?.authMethod === 'ldap' || user?.isSso;

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
                                <Label htmlFor="displayName">Anzeigename {isExternalAuth && "(Nicht änderbar)"}</Label>
                                <Input
                                    id="displayName"
                                    name="displayName"
                                    required
                                    disabled={isExternalAuth}
                                    value={formData.displayName}
                                    onChange={handleInputChange}
                                    className={isExternalAuth ? "bg-muted" : ""}
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

                        {/* Position (Multi-item via Enter) */}
                        <div className="space-y-2">
                            <Label htmlFor="positionInput">Position / Funktion</Label>
                            {positionItems.length > 0 && (
                                <div className="flex flex-wrap gap-2 pb-1">
                                    {positionItems.map((pos, idx) => (
                                        <span
                                            key={idx}
                                            className="inline-flex items-center gap-1.5 text-sm font-medium text-primary bg-primary/10 px-3 py-1 rounded-full"
                                        >
                                            <span>{pos}</span>
                                            <button
                                                type="button"
                                                onClick={() => handleRemovePosition(idx)}
                                                className="text-primary/70 hover:text-primary focus:outline-none rounded-full p-0.5 hover:bg-primary/15 transition-colors"
                                                title="Entfernen"
                                            >
                                                <X className="w-3.5 h-3.5" />
                                            </button>
                                        </span>
                                    ))}
                                </div>
                            )}
                            <Input
                                id="positionInput"
                                value={positionInput}
                                onChange={(e) => setPositionInput(e.target.value)}
                                onKeyDown={handlePositionKeyDown}
                                placeholder="Position eingeben und mit Enter hinzufügen (z.B. Klassenlehrer)"
                            />
                            <p className="text-xs text-muted-foreground">
                                Drücke <strong>Enter</strong>, um eine Position als eigenes Element hinzuzufügen. Mehrere Einträge sind möglich.
                            </p>
                        </div>

                        {/* Location Radio Selection */}
                        <div className="space-y-3 pt-2 border-t">
                            <Label className="text-base font-medium">Ort</Label>
                            <div className="grid grid-cols-1 gap-2.5">
                                <label className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${formData.locationType === 'none' ? 'border-primary bg-primary/5 font-medium' : 'hover:bg-muted/30'}`}>
                                    <input
                                        type="radio"
                                        name="locationType"
                                        value="none"
                                        checked={formData.locationType === 'none'}
                                        onChange={handleInputChange}
                                        className="h-4 w-4 text-primary"
                                    />
                                    <span className="text-sm">Keine Angabe (Standard)</span>
                                </label>

                                <div className={`p-3 rounded-lg border transition-colors ${formData.locationType === 'room' ? 'border-primary bg-primary/5' : 'hover:bg-muted/30'}`}>
                                    <label className="flex items-center gap-3 cursor-pointer">
                                        <input
                                            type="radio"
                                            name="locationType"
                                            value="room"
                                            checked={formData.locationType === 'room'}
                                            onChange={handleInputChange}
                                            className="h-4 w-4 text-primary"
                                        />
                                        <span className={`text-sm ${formData.locationType === 'room' ? 'font-medium' : ''}`}>Raum</span>
                                    </label>
                                    {formData.locationType === 'room' && (
                                        <div className="mt-2.5 pl-7">
                                            <Input
                                                name="roomNumber"
                                                value={formData.roomNumber}
                                                onChange={handleInputChange}
                                                placeholder="Raumnummer eingeben (z.B. A104)"
                                                required
                                                className="bg-background"
                                            />
                                        </div>
                                    )}
                                </div>

                                <div className={`p-3 rounded-lg border transition-colors ${formData.locationType === 'custom' ? 'border-primary bg-primary/5' : 'hover:bg-muted/30'}`}>
                                    <label className="flex items-center gap-3 cursor-pointer">
                                        <input
                                            type="radio"
                                            name="locationType"
                                            value="custom"
                                            checked={formData.locationType === 'custom'}
                                            onChange={handleInputChange}
                                            className="h-4 w-4 text-primary"
                                        />
                                        <span className={`text-sm ${formData.locationType === 'custom' ? 'font-medium' : ''}`}>Eigene Angabe</span>
                                    </label>
                                    {formData.locationType === 'custom' && (
                                        <div className="mt-2.5 pl-7">
                                            <Input
                                                name="customLocation"
                                                value={formData.customLocation}
                                                onChange={handleInputChange}
                                                placeholder="Eigene Ortsangabe eingeben..."
                                                required
                                                className="bg-background"
                                            />
                                        </div>
                                    )}
                                </div>

                                <label className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${formData.locationType === 'secretariat' ? 'border-primary bg-primary/5 font-medium' : 'hover:bg-muted/30'}`}>
                                    <input
                                        type="radio"
                                        name="locationType"
                                        value="secretariat"
                                        checked={formData.locationType === 'secretariat'}
                                        onChange={handleInputChange}
                                        className="h-4 w-4 text-primary"
                                    />
                                    <span className="text-sm">Treffpunkt Sekretariat</span>
                                </label>
                            </div>
                        </div>

                        {/* Department selection */}
                        <div className="space-y-2 pt-2 border-t">
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
