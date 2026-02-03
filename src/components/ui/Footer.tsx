import React from 'react';

const Footer: React.FC = () => {
    return (
        <div className="w-full max-w-[1400px] p-1 flex flex-col gap-2.5">
            <div className="w-full p-6 bg-white border-2 border-black rounded-lg shadow-md flex flex-col items-center gap-6">
                <div className="flex justify-center items-center gap-12">
                    <img src="/IITG_Logo.svg" alt="IITG Logo" className="w-[71px] h-[71px]" />
                    <div className="flex items-center gap-6">
                        <div className="text-black font-bold">ভাৰতীয় প্ৰযুক্তিবিদ্যা প্ৰতিষ্ঠান গুৱাহাটী</div>
                        <div className="h-6 w-px bg-gray-400"></div>
                        <div className="text-black font-bold">भारतीय प्रौद्योगिकी संस्थान गुवाहाटी</div>
                        <div className="h-6 w-px bg-gray-400"></div>
                        <div className="text-black font-bold">Indian Institute of Technology Guwahati</div>
                    </div>
                </div>
                <div className="w-full h-px bg-gray-400"></div>
                <div className="w-full flex flex-col items-center gap-6">
                    <div className="text-lg font-bold text-black uppercase">External Links</div>
                    <div className="flex justify-center items-center gap-9 flex-wrap">
                        <div className="flex items-center gap-2.5">
                            <a href="#" className="text-black font-bold hover:underline decoration-2 underline-offset-4 transition-all duration-150">Interview Candidate Registration</a>
                        </div>
                        <div className="h-4 w-px bg-gray-400"></div>
                        <div className="flex items-center gap-2.5">
                            <a href="#" className="text-black font-bold hover:underline decoration-2 underline-offset-4 transition-all duration-150">IITG Main Website</a>
                        </div>
                        <div className="h-4 w-px bg-gray-400"></div>
                        <div className="flex items-center gap-2.5">
                            <a href="#" className="text-black font-bold hover:underline decoration-2 underline-offset-4 transition-all duration-150">IITG Intranet Website</a>
                        </div>
                        <div className="h-4 w-px bg-gray-400"></div>
                        <div className="flex items-center gap-2.5">
                            <a href="#" className="text-black font-bold hover:underline decoration-2 underline-offset-4 transition-all duration-150">R&D Cell</a>
                        </div>
                        <div className="h-4 w-px bg-gray-400"></div>
                        <div className="flex items-center gap-2.5">
                            <a href="#" className="text-black font-bold hover:underline decoration-2 underline-offset-4 transition-all duration-150">R&D Rules</a>
                        </div>
                        <div className="h-4 w-px bg-gray-400"></div>
                        <div className="flex items-center gap-2.5">
                            <a href="#" className="text-black font-bold hover:underline decoration-2 underline-offset-4 transition-all duration-150">Feedback and Suggestions</a>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Footer;
