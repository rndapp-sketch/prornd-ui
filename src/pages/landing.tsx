import React, { useEffect } from 'react';

const LandingPage: React.FC = () => {
    useEffect(() => {
        window.location.replace('https://iitg.ac.in/rndproj/rnd/');
    }, []);

    return null;
};

export default LandingPage;