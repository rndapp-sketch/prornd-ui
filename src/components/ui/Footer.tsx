import React from 'react';

const Footer: React.FC = () => {
    return (
        <div style={{ width: '1400px', padding: '4px', flexDirection: 'column', justifyContent: 'flex-start', alignItems: 'flex-start', gap: '10px', display: 'flex' }}>
            <div style={{ alignSelf: 'stretch', paddingTop: '4px', paddingBottom: '8px', paddingLeft: '8px', paddingRight: '8px', background: 'white', borderRadius: '24px', outline: '1px #DDE1E6 solid', outlineOffset: '-1px', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: '24px', display: 'flex' }}>
                <div style={{ justifyContent: 'center', alignItems: 'center', gap: '48px', display: 'inline-flex' }}>
                    <img src="/IITG_Logo.svg" alt="IITG Logo" style={{ width: '71px', height: '71px' }} />
                    <div style={{ justifyContent: 'flex-start', alignItems: 'center', gap: '26px', display: 'flex' }}>
                        <div className="assamese-text">ভাৰতীয় প্ৰযুক্তিবিদ্যা প্ৰতিষ্ঠান গুৱাহাটী</div>
                        <div className="vertical-line"></div>
                        <div className="hindi-text">भारतीय प्रौद्योगिकी संस्थान गुवाहाटी</div>
                        <div className="vertical-line"></div>
                        <div className="english-text">Indian Institute of Technology Guwahati</div>
                    </div>
                </div>
                <div className="horizontal-line"></div>
                <div style={{ alignSelf: 'stretch', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: '24px', display: 'flex' }}>
                    <div className="external-links-title">External Links</div>
                    <div style={{ justifyContent: 'center', alignItems: 'center', gap: '36px', display: 'inline-flex' }}>
                        <div data-property-1="Frame 60" style={{ justifyContent: 'flex-start', alignItems: 'center', gap: '10px', display: 'flex' }}>
                            <a href="#" className="link-text">Interview Candidate Registration</a>
                        </div>
                        <div className="vertical-line-small"></div>
                        <div data-property-1="Frame 60" style={{ justifyContent: 'flex-start', alignItems: 'center', gap: '10px', display: 'flex' }}>
                            <a href="#" className="link-text">IITG Main Website</a>
                        </div>
                        <div className="vertical-line-small"></div>
                        <div data-property-1="Frame 60" style={{ justifyContent: 'flex-start', alignItems: 'center', gap: '10px', display: 'flex' }}>
                            <a href="#" className="link-text">IITG Intranet Website</a>
                        </div>
                        <div className="vertical-line-small"></div>
                        <div data-property-1="Frame 60" style={{ justifyContent: 'flex-start', alignItems: 'center', gap: '10px', display: 'flex' }}>
                            <a href="#" className="link-text">R&D Cell</a>
                        </div>
                        <div className="vertical-line-small"></div>
                        <div data-property-1="Frame 60" style={{ justifyContent: 'flex-start', alignItems: 'center', gap: '10px', display: 'flex' }}>
                            <a href="#" className="link-text">R&D Rules</a>
                        </div>
                        <div className="vertical-line-small"></div>
                        <div data-property-1="Frame 60" style={{ justifyContent: 'flex-start', alignItems: 'center', gap: '10px', display: 'flex' }}>
                            <a href="#" className="link-text">Feedback and Suggestions</a>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Footer;
