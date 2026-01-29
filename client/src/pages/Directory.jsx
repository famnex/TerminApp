import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, User, Mail, Search, Share2, Building2 } from 'lucide-react';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"

const Directory = () => {
    const [users, setUsers] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);
    const [searchParams, setSearchParams] = useSearchParams();

    const selectedDeptId = searchParams.get('dept') || 'all';

    useEffect(() => {
        const loadData = async () => {
            try {
                const [usersRes, deptsRes] = await Promise.all([
                    api.get('/public/users'),
                    api.get('/public/departments')
                ]);
                setUsers(usersRes.data);
                setDepartments(deptsRes.data);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, []);

    const handleDeptChange = (val) => {
        setSearchParams(prev => {
            if (val === 'all') {
                prev.delete('dept');
            } else {
                prev.set('dept', val);
            }
            return prev;
        });
    };

    const handleShare = () => {
        navigator.clipboard.writeText(window.location.href);
        toast.success("Link kopiert!");
    };

    const filteredUsers = users.filter(user => {
        const term = searchTerm.toLowerCase();
        const matchesSearch = (
            user.displayName?.toLowerCase().includes(term) ||
            user.position?.toLowerCase().includes(term)
        );

        const matchesDept = selectedDeptId === 'all' ||
            (user.Departments && user.Departments.some(d => d.id.toString() === selectedDeptId));

        return matchesSearch && matchesDept;
    });

    if (loading) return <div className="flex justify-center items-center h-[50vh]"><Loader2 className="animate-spin text-primary" size={32} /></div>;

    return (
        <div className="animate-fade-in-up">
            <h1 className="text-3xl font-bold text-center mb-4 tracking-tight">Unsere Experten</h1>
            <p className="text-center mb-8 text-muted-foreground max-w-2xl mx-auto">
                Wählen Sie einen Experten aus unserem Team, um den für Sie passenden Termin zu buchen.
            </p>

            {/* Search & Filter Bar */}
            <div className="max-w-2xl mx-auto mb-10 flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Suchen nach Name oder Position..."
                        className="pl-10"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <div className="w-full sm:w-[200px]">
                    <Select value={selectedDeptId} onValueChange={handleDeptChange}>
                        <SelectTrigger>
                            <SelectValue placeholder="Alle Abteilungen" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Alle Abteilungen</SelectItem>
                            {departments.map(d => (
                                <SelectItem key={d.id} value={d.id.toString()}>{d.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <Button variant="outline" size="icon" onClick={handleShare} title="Suche teilen">
                    <Share2 className="h-4 w-4" />
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredUsers.map(user => {
                    const hasAvailability = user.hasAvailability;

                    return (
                        <div key={user.id} className={`rounded-xl border bg-card text-card-foreground shadow-sm p-6 flex flex-col items-center text-center transition-all group ${hasAvailability ? 'hover:shadow-md hover:border-primary/50' : 'opacity-70 bg-muted/30'}`}>

                            {/* Profile Image */}
                            <div className="w-24 h-24 mb-4 rounded-full overflow-hidden border-2 border-muted group-hover:border-primary/20 transition-colors bg-muted flex items-center justify-center">
                                {user.profileImage ? (
                                    <img src={user.profileImage} alt={user.displayName} className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500" />
                                ) : (
                                    <User size={40} className="text-muted-foreground/50" />
                                )}
                            </div>

                            <h3 className="font-semibold text-xl mb-1">{user.displayName}</h3>

                            {/* Position */}
                            {user.position && (
                                <div className="text-sm font-medium text-primary mb-2 bg-primary/5 px-2 py-0.5 rounded-full">
                                    {user.position}
                                </div>
                            )}

                            {/* Departments (Optional to show) */}
                            <div className="flex flex-wrap justify-center gap-1 mb-4 h-6">
                                {user.Departments && user.Departments.map(d => (
                                    <span key={d.id} className="text-[10px] uppercase tracking-wider text-muted-foreground border px-1 rounded flex items-center gap-1">
                                        <Building2 size={10} /> {d.name}
                                    </span>
                                ))}
                            </div>


                            {/* Email (Conditional) */}
                            {user.showEmail ? (
                                <div className="flex items-center gap-1.5 text-muted-foreground text-sm mb-6">
                                    <Mail size={14} />
                                    <span>{user.email}</span>
                                </div>
                            ) : (
                                <div className="h-6 mb-6"></div> // Spacer to keep alignment if email hidden
                            )}

                            <Button asChild={hasAvailability} disabled={!hasAvailability} variant={hasAvailability ? "default" : "secondary"} className="w-full mt-auto">
                                {hasAvailability ? (
                                    <Link to={`/book/${user.id}`}>
                                        Termin buchen
                                    </Link>
                                ) : (
                                    <span>Keine Termine verfügbar</span>
                                )}
                            </Button>
                        </div>
                    )
                })}
            </div>
            {filteredUsers.length === 0 && (
                <div className="text-center py-12 border-2 border-dashed border-muted rounded-xl bg-muted/20">
                    <p className="text-muted-foreground">Aktuell sind keine Experten verfügbar.</p>
                </div>
            )}
        </div>
    );
};

export default Directory;
