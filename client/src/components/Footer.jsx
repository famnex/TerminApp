import React from 'react';

const Footer = () => {
    return (
        <footer className="border-t py-6 md:py-8">
            <div className="container flex flex-col items-center justify-between gap-4 md:h-16 md:flex-row">
                <p className="text-center text-sm leading-loose text-muted-foreground md:text-left w-full">
                    Steffen Fleischer (c) 2026
                </p>
            </div>
        </footer>
    );
};

export default Footer;
