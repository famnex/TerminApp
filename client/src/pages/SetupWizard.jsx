import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import axios from 'axios';
import { toast } from 'sonner';

export default function SetupWizard() {
    const [formData, setFormData] = useState({
        username: '',
        password: '',
        displayName: '',
        email: ''
    });

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await axios.post('api/public/setup', formData);
            toast.success("Einrichtung erfolgreich! Weiterleitung...");
            setTimeout(() => {
                window.location.href = "#/admin";
                window.location.reload();
            }, 1000);
        } catch (err) {
            console.error(err);
            toast.error(err.response?.data?.error || "Fehler bei der Einrichtung");
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-muted/20 p-4">
            <Card className="w-full max-w-lg">
                <CardHeader>
                    <CardTitle className="text-2xl">Willkommen! 👋</CardTitle>
                    <CardDescription>
                        Ihr Terminsystem ist fast bereit. Bitte erstellen Sie das erste Administrator-Konto.
                    </CardDescription>
                </CardHeader>
                <form onSubmit={handleSubmit}>
                    <CardContent className="space-y-4">
                        <div className="grid gap-2">
                            <Label htmlFor="displayName">Anzeigename</Label>
                            <Input
                                id="displayName"
                                placeholder="Max Mustermann"
                                value={formData.displayName}
                                onChange={e => setFormData({ ...formData, displayName: e.target.value })}
                                required
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="email">E-Mail</Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="admin@example.com"
                                value={formData.email}
                                onChange={e => setFormData({ ...formData, email: e.target.value })}
                                required
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="username">Benutzername</Label>
                            <Input
                                id="username"
                                placeholder="admin"
                                value={formData.username}
                                onChange={e => setFormData({ ...formData, username: e.target.value })}
                                required
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="password">Passwort</Label>
                            <Input
                                id="password"
                                type="password"
                                value={formData.password}
                                onChange={e => setFormData({ ...formData, password: e.target.value })}
                                required
                            />
                        </div>
                    </CardContent>
                    <CardFooter>
                        <Button type="submit" className="w-full">System installieren</Button>
                    </CardFooter>
                </form>
            </Card>
        </div>
    );
}
