import React from 'react';

const Footer = () => {
    const [version, setVersion] = React.useState('');

    React.useEffect(() => {
        fetch('api/public/version')
            .then(res => res.json())
            .then(data => setVersion(data.version))
            .catch(err => console.error('Failed to fetch version', err));
    }, []);

    return (
        <footer className="border-t py-6 md:py-8">
            <div className="container flex flex-col items-center justify-between gap-4 md:h-16 md:flex-row">
                <p className="text-center text-sm leading-loose text-muted-foreground md:text-left w-full">
                    Steffen Fleischer (c) 2026 {version && `| v${version}`}
                </p>
            </div>
        </footer>
    );
};

export default Footer;
