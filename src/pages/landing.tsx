// import React, { useEffect } from 'react';
// import { useNavigate } from 'react-router';

// const LandingPage: React.FC = () => {
//     const navigate = useNavigate();

//     useEffect(() => {
//         // Mobile menu toggle
//         const mobileMenuButton = document.getElementById('mobile-menu-button');
//         const mobileMenu = document.getElementById('mobile-menu');

//         const handleMenuToggle = () => {
//             mobileMenu?.classList.toggle('hidden');
//         };

//         mobileMenuButton?.addEventListener('click', handleMenuToggle);

//         // Smooth scrolling for anchor links
//         const anchors = document.querySelectorAll('a[href^="#"]');
//         const handleAnchorClick = function (this: HTMLAnchorElement, e: MouseEvent) {
//             if (this.getAttribute('href') === '#') {
//                 return;
//             }

//             const targetId = this.getAttribute('href');
//             if (targetId) {
//                 const targetElement = document.querySelector(targetId);
//                 if(targetElement) {
//                     e.preventDefault();
//                     targetElement.scrollIntoView({
//                         behavior: 'smooth'
//                     });
//                 }
//             }
//         };

//         anchors.forEach(anchor => {
//             anchor.addEventListener('click', handleAnchorClick as EventListener);
//         });

//         return () => {
//             mobileMenuButton?.removeEventListener('click', handleMenuToggle);
//             anchors.forEach(anchor => {
//                 anchor.removeEventListener('click', handleAnchorClick as EventListener);
//             });
//         };
//     }, []);

//     const handleLoginClick = () => {
//         navigate('/login');
//     };

//     return (
//         <div className="bg-zinc-50 dark:bg-zinc-800/50 text-zinc-800 dark:text-zinc-200">
//             {/* Header */}
//             <header className="bg-white dark:bg-zinc-900 shadow-md sticky top-0 z-50">
//                 <div className="container mx-auto px-6 py-4 flex justify-between items-center">
//                     <div className="flex items-center space-x-4">
//                         <img src="/IITG_Large_Logo.gif" alt="IITG Logo" className="h-12" />
//                         <div>
//                             <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">Research and Development</h1>
//                             <p className="text-sm text-zinc-600 dark:text-zinc-400">Indian Institute of Technology Guwahati</p>
//                         </div>
//                     </div>
//                     <nav className="hidden md:flex items-center space-x-6">
//                         <a href="#about" className="text-zinc-600 dark:text-zinc-400 hover:text-blue-600 transition-colors">About</a>
//                         <a href="#research" className="text-zinc-600 dark:text-zinc-400 hover:text-blue-600 transition-colors">Research</a>
//                         <a href="#facilities" className="text-zinc-600 dark:text-zinc-400 hover:text-blue-600 transition-colors">Facilities</a>
//                         <a href="#news" className="text-zinc-600 dark:text-zinc-400 hover:text-blue-600 transition-colors">News</a>
//                         <button onClick={handleLoginClick} className="text-blue-600 border border-blue-600 px-4 py-2 rounded-md hover:bg-blue-600 hover:text-white transition-colors">Login</button>
//                         <a href="#contact" className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors">Contact Us</a>
//                     </nav>
//                     <button className="md:hidden" id="mobile-menu-button">
//                         <i className="fas fa-bars text-2xl text-zinc-700 dark:text-zinc-300"></i>
//                     </button>
//                 </div>
//                 {/* Mobile Menu */}
//                 <div className="md:hidden hidden" id="mobile-menu">
//                     <a href="#about" className="block py-2 px-4 text-sm hover:bg-zinc-100 dark:bg-zinc-800">About</a>
//                     <a href="#research" className="block py-2 px-4 text-sm hover:bg-zinc-100 dark:bg-zinc-800">Research</a>
//                     <a href="#facilities" className="block py-2 px-4 text-sm hover:bg-zinc-100 dark:bg-zinc-800">Facilities</a>
//                     <a href="#publications" className="block py-2 px-4 text-sm hover:bg-zinc-100 dark:bg-zinc-800">Publications</a>
//                     <a href="#events" className="block py-2 px-4 text-sm hover:bg-zinc-100 dark:bg-zinc-800">Events</a>
//                     <a href="#news" className="block py-2 px-4 text-sm hover:bg-zinc-100 dark:bg-zinc-800">News</a>
//                     <button onClick={handleLoginClick} className="block w-full text-left py-2 px-4 text-sm text-blue-600 hover:bg-blue-100">Login</button>
//                     <a href="#contact" className="block py-2 px-4 text-sm bg-blue-600 text-white text-center rounded-b-md hover:bg-blue-700">Contact Us</a>
//                 </div>
//             </header>

//             {/* Hero Section */}
//             <section 
//                 className="hero-section text-white" 
//                 style={{ background: "linear-gradient(rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.5)), url('https://placehold.co/1600x800/3b82f6/ffffff?text=IITG+Campus') no-repeat center center/cover" }}
//             >
//                 <div className="container mx-auto px-6 py-32 text-center">
//                     <h2 className="text-4xl md:text-6xl font-bold mb-4">Driving Innovation, Shaping the Future</h2>
//                     <p className="text-lg md:text-xl max-w-3xl mx-auto mb-8">Fostering a culture of cutting-edge research and development to address global challenges and advance scientific knowledge.</p>
//                     <a href="#research" className="bg-white dark:bg-zinc-900 text-blue-600 font-bold py-3 px-8 rounded-full hover:bg-zinc-200 dark:bg-zinc-700 transition-transform transform hover:scale-105">Explore Our Research</a>
//                 </div>
//             </section>

//             <main className="container mx-auto px-6 py-12">

//                 {/* About R&D Section */}
//                 <section id="about" className="mb-16 scroll-mt-20">
//                     <div className="grid md:grid-cols-2 gap-12 items-center">
//                         <div>
//                             <h2 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100 mb-4">Welcome to R&D at IIT Guwahati</h2>
//                             <p className="mb-4 text-lg">The Research and Development (R&D) section at IIT Guwahati is the central hub for overseeing and encouraging the institute's vibrant research activities. We are committed to fostering an environment that promotes high-impact, interdisciplinary research and innovation.</p>
//                             <p className="mb-6">Our mission is to provide comprehensive support to faculty and students, manage sponsored research projects, facilitate collaborations, and ensure the highest standards of research integrity.</p>
//                             <div className="flex space-x-4">
//                                 <div className="bg-blue-100 p-4 rounded-lg text-center flex-1">
//                                     <p className="text-3xl font-bold text-blue-700">500+</p>
//                                     <p className="text-sm text-blue-600">Ongoing Projects</p>
//                                 </div>
//                                 <div className="bg-green-100 p-4 rounded-lg text-center flex-1">
//                                     <p className="text-3xl font-bold text-green-700">200+</p>
//                                     <p className="text-sm text-green-600">Patents Filed</p>
//                                 </div>
//                                 <div className="bg-purple-100 p-4 rounded-lg text-center flex-1">
//                                     <p className="text-3xl font-bold text-purple-700">₹500 Cr+</p>
//                                     <p className="text-sm text-purple-600">External Funding</p>
//                                 </div>
//                             </div>
//                         </div>
//                         <div className="rounded-lg overflow-hidden shadow-xl">
//                             <img src="https://placehold.co/600x400/e2e8f0/334155?text=Research+Lab" alt="Research Lab" className="w-full h-full object-cover" />
//                         </div>
//                     </div>
//                 </section>

//                 {/* Research Areas Section */}
//                 <section id="research" className="mb-16 scroll-mt-20">
//                     <h2 className="text-3xl font-bold text-center text-zinc-900 dark:text-zinc-100 mb-2">Our Research Areas</h2>
//                     <p className="text-center text-lg text-zinc-600 dark:text-zinc-400 mb-10">Exploring the frontiers of science and technology.</p>
//                     <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
//                         <div className="bg-white dark:bg-zinc-900 p-6 rounded-lg shadow-lg hover:shadow-xl transition-shadow">
//                             <div className="text-blue-500 mb-4"><i className="fas fa-microchip text-4xl"></i></div>
//                             <h3 className="font-bold text-xl mb-2 text-blue-800">AI & Machine Learning</h3>
//                             <p className="text-zinc-600 dark:text-zinc-400">Developing intelligent systems for data analysis, automation, and decision making.</p>
//                         </div>
//                         <div className="bg-white dark:bg-zinc-900 p-6 rounded-lg shadow-lg hover:shadow-xl transition-shadow">
//                             <div className="text-green-500 mb-4"><i className="fas fa-dna text-4xl"></i></div>
//                             <h3 className="font-bold text-xl mb-2 text-green-800">Biotechnology</h3>
//                             <p className="text-zinc-600 dark:text-zinc-400">Innovating in healthcare, agriculture, and environmental science through genetic engineering.</p>
//                         </div>
//                         <div className="bg-white dark:bg-zinc-900 p-6 rounded-lg shadow-lg hover:shadow-xl transition-shadow">
//                             <div className="text-red-500 mb-4"><i className="fas fa-atom text-4xl"></i></div>
//                             <h3 className="font-bold text-xl mb-2 text-red-800">Advanced Materials</h3>
//                             <p className="text-zinc-600 dark:text-zinc-400">Creating next-generation materials for electronics, energy, and aerospace applications.</p>
//                         </div>
//                         <div className="bg-white dark:bg-zinc-900 p-6 rounded-lg shadow-lg hover:shadow-xl transition-shadow">
//                             <div className="text-yellow-500 mb-4"><i className="fas fa-solar-panel text-4xl"></i></div>
//                             <h3 className="font-bold text-xl mb-2 text-yellow-800">Sustainable Energy</h3>
//                             <p className="text-zinc-600 dark:text-zinc-400">Researching renewable energy sources and efficient energy storage solutions.</p>
//                         </div>
//                     </div>
//                 </section>

//                 {/* Facilities Section */}
//                 <section id="facilities" className="mb-16 scroll-mt-20">
//                     <h2 className="text-3xl font-bold text-center text-zinc-900 dark:text-zinc-100 mb-2">State-of-the-Art Facilities</h2>
//                     <p className="text-center text-lg text-zinc-600 dark:text-zinc-400 mb-10">Empowering research with world-class infrastructure.</p>
//                     <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
//                         <div className="bg-white dark:bg-zinc-900 p-6 rounded-lg shadow-lg text-center hover:shadow-xl transition-shadow">
//                             <i className="fas fa-server text-4xl text-blue-500 mx-auto mb-4"></i>
//                             <h3 className="font-bold text-xl mb-2">High-Performance Computing</h3>
//                             <p className="text-zinc-600 dark:text-zinc-400">Access to supercomputing clusters for complex simulations and data analysis.</p>
//                         </div>
//                         <div className="bg-white dark:bg-zinc-900 p-6 rounded-lg shadow-lg text-center hover:shadow-xl transition-shadow">
//                             <i className="fas fa-cogs text-4xl text-green-500 mx-auto mb-4"></i>
//                             <h3 className="font-bold text-xl mb-2">Central Instruments Facility</h3>
//                             <p className="text-zinc-600 dark:text-zinc-400">A comprehensive range of sophisticated analytical instruments.</p>
//                         </div>
//                         <div className="bg-white dark:bg-zinc-900 p-6 rounded-lg shadow-lg text-center hover:shadow-xl transition-shadow">
//                             <i className="fas fa-flask text-4xl text-purple-500 mx-auto mb-4"></i>
//                             <h3 className="font-bold text-xl mb-2">Nanotechnology Lab</h3>
//                             <p className="text-zinc-600 dark:text-zinc-400">Advanced fabrication and characterization tools for nanoscale research.</p>
//                         </div>
//                     </div>
//                 </section>

//                 {/* Featured Publications Section */}
//                 <section id="publications" className="mb-16 scroll-mt-20">
//                     <h2 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100 mb-6">Featured Publications</h2>
//                     <div className="space-y-6">
//                         <div className="bg-white dark:bg-zinc-900 p-4 rounded-lg shadow-md hover:shadow-lg transition-shadow">
//                             <h3 className="font-semibold text-lg text-blue-700">A Novel Approach to Water Purification Using Graphene Oxide Membranes</h3>
//                             <p className="text-sm text-zinc-600 dark:text-zinc-400">A. Kumar, B. Sharma, et al. | <span className="italic">Journal of Membrane Science</span>, 2025</p>
//                             <a href="#" className="text-sm text-blue-600 hover:underline mt-1 inline-block">Read More &rarr;</a>
//                         </div>
//                         <div className="bg-white dark:bg-zinc-900 p-4 rounded-lg shadow-md hover:shadow-lg transition-shadow">
//                             <h3 className="font-semibold text-lg text-blue-700">Deep Learning for Early Diagnosis of Alzheimer's Disease from MRI Scans</h3>
//                             <p className="text-sm text-zinc-600 dark:text-zinc-400">S. Das, P. Mehta, et al. | <span className="italic">Nature Medicine</span>, 2025</p>
//                             <a href="#" className="text-sm text-blue-600 hover:underline mt-1 inline-block">Read More &rarr;</a>
//                         </div>
//                     </div>
//                 </section>

//                 {/* Events Section */}
//                 <section id="events" className="mb-16 scroll-mt-20">
//                     <h2 className="text-3xl font-bold text-center text-zinc-900 dark:text-zinc-100 mb-10">Upcoming Events & Workshops</h2>
//                     <div className="grid md:grid-cols-2 gap-8">
//                         <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-lg overflow-hidden flex items-center">
//                             <div className="bg-blue-600 text-white text-center p-4">
//                                 <p className="text-xl font-bold">AUG</p>
//                                 <p className="text-4xl font-bold">15</p>
//                             </div>
//                             <div className="p-6">
//                                 <h3 className="font-bold text-xl mb-2">International Conference on Robotics and Automation</h3>
//                                 <p className="text-zinc-600 dark:text-zinc-400 mb-3">Join global experts to discuss the latest trends in robotics.</p>
//                                 <a href="#" className="font-semibold text-blue-600 hover:underline">Learn More</a>
//                             </div>
//                         </div>
//                         <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-lg overflow-hidden flex items-center">
//                             <div className="bg-green-600 text-white text-center p-4">
//                                 <p className="text-xl font-bold">SEP</p>
//                                 <p className="text-4xl font-bold">05</p>
//                             </div>
//                             <div className="p-6">
//                                 <h3 className="font-bold text-xl mb-2">Workshop on Scientific Writing & Publishing</h3>
//                                 <p className="text-zinc-600 dark:text-zinc-400 mb-3">Enhance your academic writing skills with guidance from seasoned editors.</p>
//                                 <a href="#" className="font-semibold text-blue-600 hover:underline">Register Now</a>
//                             </div>
//                         </div>
//                     </div>
//                 </section>

//                 {/* News & Updates Section */}
//                 <div className="grid lg:grid-cols-3 gap-12">
//                     <section id="news" className="lg:col-span-2 scroll-mt-20">
//                         <h2 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100 mb-6">News & Highlights</h2>
//                         <div className="space-y-8">
//                             <div className="flex items-start space-x-4 bg-white dark:bg-zinc-900 p-4 rounded-lg shadow-md">
//                                 <div className="flex-shrink-0 w-24 h-24">
//                                     <img src="https://placehold.co/100x100/34d399/ffffff?text=Event" alt="News Image" className="w-full h-full object-cover rounded-md" />
//                                 </div>
//                                 <div>
//                                     <p className="text-sm text-zinc-500 dark:text-zinc-400">July 25, 2025</p>
//                                     <h3 className="font-semibold text-lg hover:text-blue-600"><a href="#">IITG researchers develop a new catalyst for green hydrogen production.</a></h3>
//                                     <p className="text-zinc-600 dark:text-zinc-400 mt-1">A team led by Prof. John Doe has made a significant breakthrough in sustainable energy...</p>
//                                 </div>
//                             </div>
//                             <div className="flex items-start space-x-4 bg-white dark:bg-zinc-900 p-4 rounded-lg shadow-md">
//                                 <div className="flex-shrink-0 w-24 h-24">
//                                     <img src="https://placehold.co/100x100/fbbf24/ffffff?text=Award" alt="News Image" className="w-full h-full object-cover rounded-md" />
//                                 </div>
//                                 <div>
//                                     <p className="text-sm text-zinc-500 dark:text-zinc-400">July 18, 2025</p>
//                                     <h3 className="font-semibold text-lg hover:text-blue-600"><a href="#">Dr. Jane Smith receives the prestigious Young Scientist Award.</a></h3>
//                                     <p className="text-zinc-600 dark:text-zinc-400 mt-1">Her work on nano-materials has been recognized for its potential impact on electronics...</p>
//                                 </div>
//                             </div>
//                         </div>
//                         <div className="text-center mt-8">
//                             <a href="#" className="text-blue-600 font-semibold hover:underline">View All News &rarr;</a>
//                         </div>
//                     </section>

//                     <aside id="updates" className="scroll-mt-20">
//                         <div className="bg-white dark:bg-zinc-900 p-6 rounded-lg shadow-lg sticky top-24">
//                             <h3 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-4">Updates & Links</h3>
//                             <div className="mb-6">
//                                 <h4 className="font-semibold mb-3 text-zinc-800 dark:text-zinc-200 border-b pb-2">New Updates</h4>
//                                 <ul className="space-y-3 text-sm">
//                                     <li className="hover:text-blue-600"><a href="#">Call for proposals: Interdisciplinary Research Grant 2025 <span className="text-red-500 font-semibold">(New)</span></a></li>
//                                     <li className="hover:text-blue-600"><a href="#">Guidelines for project submission updated.</a></li>
//                                     <li className="hover:text-blue-600"><a href="#">Upcoming workshop on Intellectual Property Rights.</a></li>
//                                 </ul>
//                             </div>
//                             <div>
//                                 <h4 className="font-semibold mb-3 text-zinc-800 dark:text-zinc-200 border-b pb-2">Quick Links</h4>
//                                 <ul className="space-y-2 text-blue-600">
//                                 <li><a href="#" className="hover:underline flex items-center"><i className="fas fa-file-alt mr-2"></i>Project Forms</a></li>
//                                 <li><a href="#" className="hover:underline flex items-center"><i className="fas fa-book-open mr-2"></i>Research Policies</a></li>
//                                 <li><a href="#" className="hover:underline flex items-center"><i className="fas fa-handshake mr-2"></i>Industry Collaboration</a></li>
//                                 <li><a href="#" className="hover:underline flex items-center"><i className="fas fa-lightbulb mr-2"></i>IPR Cell</a></li>
//                                 <li><a href="#" className="hover:underline flex items-center"><i className="fas fa-users mr-2"></i>Faculty Directory</a></li>
//                                 </ul>
//                             </div>
//                         </div>
//                     </aside>
//                 </div>
//             </main>

//             <footer id="contact" className="bg-gray-800 text-white mt-16">
//                 <div className="container mx-auto px-6 py-12">
//                     <div className="grid md:grid-cols-3 gap-8">
//                         <div>
//                             <h3 className="text-xl font-bold mb-4">R&D Office</h3>
//                             <p className="mb-2">Indian Institute of Technology Guwahati</p>
//                             <p>Guwahati - 781039, Assam, India</p>
//                         </div>
//                         <div>
//                             <h3 className="text-xl font-bold mb-4">Contact Information</h3>
//                             <p><i className="fas fa-phone-alt mr-2"></i>+91-361-258-XXXX</p>
//                             <p><i className="fas fa-envelope mr-2"></i>rnd-office@iitg.ac.in</p>
//                         </div>
//                         <div>
//                             <h3 className="text-xl font-bold mb-4">Follow Us</h3>
//                             <div className="flex space-x-4">
//                                 <a href="#" className="text-zinc-400 dark:text-zinc-500 hover:text-white"><i className="fab fa-twitter fa-2x"></i></a>
//                                 <a href="#" className="text-zinc-400 dark:text-zinc-500 hover:text-white"><i className="fab fa-linkedin-in fa-2x"></i></a>
//                                 <a href="#" className="text-zinc-400 dark:text-zinc-500 hover:text-white"><i className="fab fa-youtube fa-2x"></i></a>
//                             </div>
//                         </div>
//                     </div>
//                     <div className="border-t border-gray-700 mt-8 pt-6 text-center text-zinc-500 dark:text-zinc-400 text-sm">
//                         <p>&copy; 2025 R&D, IIT Guwahati. All Rights Reserved.</p>
//                     </div>
//                 </div>
//             </footer>
//         </div>
//     );
// };

// export default LandingPage;



// -=-=-=-=-=-=-=-=

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';

// --- Icons (Inline SVGs to replace FontAwesome) ---
const MenuIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><line x1="4" y1="12" x2="20" y2="12" /><line x1="4" y1="6" x2="20" y2="6" /><line x1="4" y1="18" x2="20" y2="18" /></svg>
);
const CpuIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><rect x="4" y="4" width="16" height="16" rx="2" /><rect x="9" y="9" width="6" height="6" /><line x1="9" y1="1" x2="9" y2="4" /><line x1="15" y1="1" x2="15" y2="4" /><line x1="9" y1="20" x2="9" y2="23" /><line x1="15" y1="20" x2="15" y2="23" /><line x1="20" y1="9" x2="23" y2="9" /><line x1="20" y1="14" x2="23" y2="14" /><line x1="1" y1="9" x2="4" y2="9" /><line x1="1" y1="14" x2="4" y2="14" /></svg>
);
const DnaIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M2 15c6.667-6 13.333 0 20-6" /><path d="M9 22c1.798-1.998 2.518-3.995 2.807-5.993" /><path d="M15 2c-1.798 1.998-2.518 3.995-2.807 5.993" /><path d="M17 6l-2.5-2.5" /><path d="M14 8l-1-1" /><path d="M7 18l2.5 2.5" /><path d="M3.5 14.5l-1 1" /><path d="M20 9l2.5 2.5" /><path d="M14.5 16.5l-1 1" /><path d="M8 17l-1-1" /><path d="M17 22c-6.67-6-13.33-0-20-6" /></svg>
);
const AtomIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><circle cx="12" cy="12" r="1" /><path d="M20.2 20.2c2.04-2.03.02-7.36-4.5-11.9-4.54-4.52-9.87-6.54-11.9-4.5-2.04 2.03-.02 7.36 4.5 11.9 4.54 4.52 9.87 6.54 11.9 4.5Z" /><path d="M15.7 15.7c4.52-4.54 6.54-9.87 4.5-11.9-2.03-2.04-7.36-.02-11.9 4.5-4.52 4.54-6.54 9.87-4.5 11.9 2.03 2.04 7.36.02 11.9-4.5Z" /></svg>
);
const SunIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><circle cx="12" cy="12" r="4" /><path d="M12 2v2" /><path d="M12 20v2" /><path d="M4.93 4.93l1.41 1.41" /><path d="M17.66 17.66l1.41 1.41" /><path d="M2 12h2" /><path d="M20 12h2" /><path d="M6.34 17.66l-1.41 1.41" /><path d="M19.07 4.93l-1.41 1.41" /></svg>
);
const ServerIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><rect width="20" height="8" x="2" y="2" rx="2" ry="2" /><rect width="20" height="8" x="2" y="14" rx="2" ry="2" /><line x1="6" x2="6.01" y1="6" y2="6" /><line x1="6" x2="6.01" y1="18" y2="18" /></svg>
);
const SettingsIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.09a2 2 0 0 1-1-1.74v-.51a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" /><circle cx="12" cy="12" r="3" /></svg>
);
const FlaskIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M10 2v7.527a2 2 0 0 1-.211.896L4.72 20.55a1 1 0 0 0 .9 1.45h12.76a1 1 0 0 0 .9-1.45l-5.069-10.127A2 2 0 0 1 14 9.527V2" /><path d="M8.5 2h7" /><path d="M7 16h10" /></svg>
);
const PhoneIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" /></svg>
);
const MailIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><rect width="20" height="16" x="2" y="4" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" /></svg>
);
const FileTextIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" /><polyline points="14 2 14 8 20 8" /></svg>
);

const LandingPage: React.FC = () => {
    const navigate = useNavigate();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    useEffect(() => {
        // Smooth scrolling for anchor links
        const anchors = document.querySelectorAll('a[href^="#"]');
        const handleAnchorClick = function (this: HTMLAnchorElement, e: MouseEvent) {
            if (this.getAttribute('href') === '#') return;

            const targetId = this.getAttribute('href');
            if (targetId) {
                const targetElement = document.querySelector(targetId);
                if (targetElement) {
                    e.preventDefault();
                    targetElement.scrollIntoView({ behavior: 'smooth' });
                    setIsMobileMenuOpen(false);
                }
            }
        };

        anchors.forEach(anchor => {
            anchor.addEventListener('click', handleAnchorClick as EventListener);
        });

        return () => {
            anchors.forEach(anchor => {
                anchor.removeEventListener('click', handleAnchorClick as EventListener);
            });
        };
    }, []);

    const handleLoginClick = () => {
        navigate('/login');
    };

    return (
        <div className="bg-claude-bg text-zinc-900 dark:text-zinc-100 font-sans">
            {/* Header */}
            <header className="bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 sticky top-0 z-50 shadow-sm">
                <div className="container mx-auto px-6 py-4 flex justify-between items-center">
                    <div className="flex items-center space-x-4">
                        <div className="h-10 w-10 bg-[#D97757] text-white flex items-center justify-center font-bold text-xs rounded-xl">
                            IITG
                        </div>
                        <div>
                            <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 leading-tight">Research and Development</h1>
                            <p className="text-sm text-[#6B7280]">Indian Institute of Technology Guwahati</p>
                        </div>
                    </div>

                    {/* Desktop Nav */}
                    <nav className="hidden md:flex items-center space-x-1">
                        {['About', 'Research', 'Facilities', 'News'].map((item) => (
                            <a
                                key={item}
                                href={`#${item.toLowerCase()}`}
                                className="text-zinc-600 dark:text-zinc-400 font-medium px-4 py-2 rounded-full hover:bg-zinc-50 dark:bg-zinc-800/50 hover:text-zinc-900 dark:text-zinc-100 transition-colors"
                            >
                                {item}
                            </a>
                        ))}
                        <button
                            onClick={handleLoginClick}
                            className="ml-2 frappe-btn frappe-btn-outline"
                        >
                            Login
                        </button>
                        <a
                            href="#contact"
                            className="ml-2 frappe-btn frappe-btn-primary"
                        >
                            Contact Us
                        </a>
                    </nav>

                    {/* Mobile Menu Button */}
                    <button
                        className="md:hidden p-2 rounded-lg hover:bg-zinc-50 dark:bg-zinc-800/50 transition-colors"
                        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                        aria-label="Toggle menu"
                    >
                        <MenuIcon className="text-zinc-700 dark:text-zinc-300" />
                    </button>
                </div>

                {/* Mobile Menu */}
                {isMobileMenuOpen && (
                    <div className="md:hidden border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
                        {['About', 'Research', 'Facilities', 'Publications', 'Events', 'News'].map((item) => (
                            <a
                                key={item}
                                href={`#${item.toLowerCase()}`}
                                className="block py-3 px-6 text-sm font-medium border-b border-gray-50 hover:bg-zinc-50 dark:bg-zinc-800/50 text-zinc-700 dark:text-zinc-300"
                            >
                                {item}
                            </a>
                        ))}
                        <div className="p-4 space-y-3 bg-zinc-50 dark:bg-zinc-800/50">
                            <button onClick={handleLoginClick} className="block w-full frappe-btn frappe-btn-outline">Login</button>
                            <a href="#contact" className="block w-full frappe-btn frappe-btn-primary text-center">Contact Us</a>
                        </div>
                    </div>
                )}
            </header>

            {/* Hero Section */}
            <section className="relative text-white">
                {/* Background Image with Overlay */}
                <div className="absolute inset-0 z-0">
                    <img src="https://placehold.co/1600x800/3b82f6/ffffff?text=IITG+Campus" alt="Background" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-zinc-900/60"></div>
                </div>

                <div className="container mx-auto px-6 py-28 text-center relative z-10">
                    <h2 className="text-4xl md:text-5xl font-bold mb-6 tracking-tight">
                        Driving Innovation, <br className="hidden md:block" />Shaping the Future
                    </h2>
                    <p className="text-lg md:text-xl max-w-3xl mx-auto mb-10 text-gray-200 leading-relaxed">
                        Fostering a culture of cutting-edge research and development to address global challenges and advance scientific knowledge.
                    </p>
                    <a
                        href="#research"
                        className="inline-block bg-white dark:bg-zinc-900 text-[#D97757] font-semibold py-3 px-8 rounded-full shadow-md hover:shadow-lg transition-all duration-200"
                    >
                        Explore Our Research
                    </a>
                </div>
            </section>

            <main className="container mx-auto px-6 py-16 space-y-20">

                {/* About R&D Section */}
                <section id="about" className="scroll-mt-24">
                    <div className="grid md:grid-cols-2 gap-12 items-start">
                        <div>
                            <div className="inline-block px-3 py-1 bg-amber-100 border border-amber-300 text-amber-800 rounded-full text-sm font-bold mb-4">
                                WHO WE ARE
                            </div>
                            <h2 className="text-4xl font-bold text-zinc-900 dark:text-zinc-100 mb-6">Welcome to R&D at IIT Guwahati</h2>
                            <p className="mb-4 text-lg text-zinc-700 dark:text-zinc-300 leading-relaxed">
                                The Research and Development (R&D) section at IIT Guwahati is the central hub for overseeing and encouraging the institute's vibrant research activities. We are committed to fostering an environment that promotes high-impact, interdisciplinary research.
                            </p>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8">
                                <div className="bg-blue-50 p-4 rounded-lg border-2 border-gray-900 shadow-[2px_2px_0px_rgba(0,0,0,0.1)] text-center">
                                    <p className="text-3xl font-extrabold text-blue-800">500+</p>
                                    <p className="text-xs font-bold uppercase text-blue-600 mt-1">Ongoing Projects</p>
                                </div>
                                <div className="bg-emerald-50 p-4 rounded-lg border-2 border-gray-900 shadow-[2px_2px_0px_rgba(0,0,0,0.1)] text-center">
                                    <p className="text-3xl font-extrabold text-emerald-800">200+</p>
                                    <p className="text-xs font-bold uppercase text-emerald-600 mt-1">Patents Filed</p>
                                </div>
                                <div className="bg-purple-50 p-4 rounded-lg border-2 border-gray-900 shadow-[2px_2px_0px_rgba(0,0,0,0.1)] text-center">
                                    <p className="text-3xl font-extrabold text-purple-800">₹500 Cr</p>
                                    <p className="text-xs font-bold uppercase text-purple-600 mt-1">External Funding</p>
                                </div>
                            </div>
                        </div>
                        <div className="rounded-lg border-2 border-gray-900 shadow-[8px_8px_0px_rgba(0,0,0,0.1)] overflow-hidden h-full min-h-[300px]">
                            <img src="https://placehold.co/600x400/e2e8f0/334155?text=Research+Lab" alt="Research Lab" className="w-full h-full object-cover" />
                        </div>
                    </div>
                </section>

                {/* Research Areas Section */}
                <section id="research" className="scroll-mt-24">
                    <div className="text-center mb-10">
                        <h2 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100 mb-3">Our Research Areas</h2>
                        <p className="text-lg text-zinc-600 dark:text-zinc-400 font-medium">Exploring the frontiers of science and technology.</p>
                    </div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {[
                            { icon: <CpuIcon className="w-8 h-8" />, title: "AI & ML", desc: "Intelligent systems for data analysis and automation.", color: "bg-blue-100", textColor: "text-blue-800" },
                            { icon: <DnaIcon className="w-8 h-8" />, title: "Biotechnology", desc: "Innovating in healthcare and environmental science.", color: "bg-emerald-100", textColor: "text-emerald-800" },
                            { icon: <AtomIcon className="w-8 h-8" />, title: "Materials", desc: "Next-gen materials for energy and aerospace.", color: "bg-red-100", textColor: "text-red-800" },
                            { icon: <SunIcon className="w-8 h-8" />, title: "Energy", desc: "Renewable sources and efficient storage solutions.", color: "bg-amber-100", textColor: "text-amber-800" },
                        ].map((area, idx) => (
                            <div key={idx} className="bg-white dark:bg-zinc-900 p-6 rounded-lg border-2 border-gray-900 shadow-[2px_2px_0px_rgba(0,0,0,0.1)] hover:shadow-[4px_4px_0px_rgba(0,0,0,0.1)] hover:translate-y-[-2px] transition-all duration-200">
                                <div className={`w-14 h-14 ${area.color} ${area.textColor} border-2 border-gray-900 rounded-lg flex items-center justify-center mb-4`}>
                                    {area.icon}
                                </div>
                                <h3 className="font-bold text-xl mb-2 text-zinc-900 dark:text-zinc-100">{area.title}</h3>
                                <p className="text-zinc-600 dark:text-zinc-400 text-sm leading-relaxed">{area.desc}</p>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Facilities Section */}
                <section id="facilities" className="scroll-mt-24 bg-white dark:bg-zinc-900 border-2 border-gray-900 rounded-lg p-8 shadow-[4px_4px_0px_rgba(0,0,0,0.1)]">
                    <div className="text-center mb-10">
                        <h2 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">State-of-the-Art Facilities</h2>
                        <p className="text-zinc-600 dark:text-zinc-400 font-medium">Empowering research with world-class infrastructure.</p>
                    </div>
                    <div className="grid md:grid-cols-3 gap-8">
                        {[
                            { icon: <ServerIcon className="w-10 h-10" />, title: "High-Performance Computing", desc: "Supercomputing clusters for complex simulations." },
                            { icon: <SettingsIcon className="w-10 h-10" />, title: "Central Instruments Facility", desc: "Comprehensive range of analytical instruments." },
                            { icon: <FlaskIcon className="w-10 h-10" />, title: "Nanotechnology Lab", desc: "Fabrication tools for nanoscale research." },
                        ].map((facility, idx) => (
                            <div key={idx} className="text-center p-4 hover:bg-stone-50 rounded-lg transition-colors">
                                <div className="mx-auto w-16 h-16 bg-stone-100 border-2 border-gray-900 rounded-full flex items-center justify-center text-zinc-800 dark:text-zinc-200 mb-4">
                                    {facility.icon}
                                </div>
                                <h3 className="font-bold text-lg mb-2 text-zinc-900 dark:text-zinc-100">{facility.title}</h3>
                                <p className="text-zinc-600 dark:text-zinc-400 text-sm">{facility.desc}</p>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Featured Publications Section */}
                <section id="publications" className="scroll-mt-24">
                    <h2 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100 mb-6 flex items-center">
                        <span className="w-3 h-8 bg-blue-600 mr-3 rounded-sm"></span>
                        Featured Publications
                    </h2>
                    <div className="grid gap-4">
                        {[
                            { title: "A Novel Approach to Water Purification Using Graphene Oxide Membranes", author: "A. Kumar, B. Sharma, et al.", journal: "Journal of Membrane Science, 2025" },
                            { title: "Deep Learning for Early Diagnosis of Alzheimer's Disease from MRI Scans", author: "S. Das, P. Mehta, et al.", journal: "Nature Medicine, 2025" }
                        ].map((pub, idx) => (
                            <div key={idx} className="bg-white dark:bg-zinc-900 p-5 rounded-lg border-2 border-gray-900 shadow-[2px_2px_0px_rgba(0,0,0,0.1)] hover:bg-blue-50 transition-colors cursor-pointer group">
                                <h3 className="font-bold text-lg text-blue-800 group:underline decoration-2 underline-offset-2">{pub.title}</h3>
                                <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-2 font-medium">{pub.author}</p>
                                <p className="text-xs text-zinc-500 dark:text-zinc-400 italic mt-1 border-t border-zinc-200 dark:border-zinc-800 pt-2 inline-block">{pub.journal}</p>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Events Section */}
                <section id="events" className="scroll-mt-24">
                    <h2 className="text-3xl font-bold text-center text-zinc-900 dark:text-zinc-100 mb-10">Upcoming Events</h2>
                    <div className="grid md:grid-cols-2 gap-8">
                        {[
                            { month: "AUG", day: "15", title: "Intl. Conference on Robotics", desc: "Join global experts to discuss trends.", color: "bg-blue-600" },
                            { month: "SEP", day: "05", title: "Workshop on Scientific Writing", desc: "Enhance your academic writing skills.", color: "bg-emerald-600" }
                        ].map((event, idx) => (
                            <div key={idx} className="bg-white dark:bg-zinc-900 rounded-lg border-2 border-gray-900 shadow-[4px_4px_0px_rgba(0,0,0,0.1)] overflow-hidden flex items-stretch hover:translate-y-[-2px] transition-transform">
                                <div className={`${event.color} text-white text-center p-4 flex flex-col justify-center min-w-[100px] border-r-2 border-gray-900`}>
                                    <p className="text-lg font-bold opacity-80">{event.month}</p>
                                    <p className="text-4xl font-black">{event.day}</p>
                                </div>
                                <div className="p-6 flex flex-col justify-center">
                                    <h3 className="font-bold text-xl mb-2 text-zinc-900 dark:text-zinc-100">{event.title}</h3>
                                    <p className="text-zinc-600 dark:text-zinc-400 text-sm mb-3">{event.desc}</p>
                                    <a href="#" className="font-bold text-sm text-zinc-900 dark:text-zinc-100 hover:text-blue-600 underline decoration-2 underline-offset-4">Register Now</a>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                {/* News & Updates Section */}
                <div className="grid lg:grid-cols-3 gap-8 items-start">
                    <section id="news" className="lg:col-span-2 scroll-mt-24">
                        <h2 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100 mb-6">News & Highlights</h2>
                        <div className="space-y-6">
                            {[
                                { date: "July 25, 2025", title: "IITG researchers develop a new catalyst for green hydrogen.", desc: "Breakthrough in sustainable energy led by Prof. John Doe." },
                                { date: "July 18, 2025", title: "Dr. Jane Smith receives prestigious Young Scientist Award.", desc: "Recognized for work on nano-materials in electronics." }
                            ].map((news, idx) => (
                                <div key={idx} className="flex flex-col sm:flex-row items-start gap-4 bg-white dark:bg-zinc-900 p-5 rounded-lg border-2 border-gray-900 shadow-[2px_2px_0px_rgba(0,0,0,0.1)]">
                                    <div className="flex-shrink-0 w-full sm:w-24 h-24 bg-stone-200 rounded-lg border-2 border-gray-900 overflow-hidden">
                                        <img src={`https://placehold.co/100x100/${idx === 0 ? '34d399' : 'fbbf24'}/ffffff?text=News`} alt="News" className="w-full h-full object-cover" />
                                    </div>
                                    <div>
                                        <span className="inline-block px-2 py-0.5 rounded text-xs font-bold bg-stone-100 text-zinc-500 dark:text-zinc-400 mb-2">{news.date}</span>
                                        <h3 className="font-bold text-lg text-zinc-900 dark:text-zinc-100 hover:text-blue-600 transition-colors leading-snug cursor-pointer">{news.title}</h3>
                                        <p className="text-zinc-600 dark:text-zinc-400 mt-2 text-sm">{news.desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="text-center mt-8">
                            <button className="text-zinc-900 dark:text-zinc-100 font-bold border-b-2 border-gray-900 hover:text-blue-600 hover:border-blue-600 transition-colors pb-1">View All News &rarr;</button>
                        </div>
                    </section>

                    <aside id="updates" className="scroll-mt-24">
                        <div className="bg-yellow-50 p-6 rounded-lg border-2 border-gray-900 shadow-[4px_4px_0px_rgba(0,0,0,0.1)] sticky top-24 relative">
                            {/* Tape Effect */}
                            <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 w-24 h-6 bg-yellow-200/80 rotate-1 border border-yellow-300"></div>

                            <h3 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-6">Updates & Links</h3>

                            <div className="mb-8">
                                <h4 className="font-bold text-sm uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-4 border-b-2 border-zinc-200 dark:border-zinc-800 pb-2">Latest Updates</h4>
                                <ul className="space-y-4 text-sm font-medium">
                                    <li>
                                        <a href="#" className="block hover:text-blue-700 group">
                                            <span className="bg-red-100 text-red-700 border border-red-200 text-xs px-1.5 rounded mr-2 font-bold">NEW</span>
                                            Call for proposals: Interdisciplinary Grant 2025
                                        </a>
                                    </li>
                                    <li><a href="#" className="block text-zinc-700 dark:text-zinc-300 hover:text-blue-700">Guidelines for project submission updated.</a></li>
                                    <li><a href="#" className="block text-zinc-700 dark:text-zinc-300 hover:text-blue-700">Upcoming workshop on IPR.</a></li>
                                </ul>
                            </div>

                            <div>
                                <h4 className="font-bold text-sm uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-4 border-b-2 border-zinc-200 dark:border-zinc-800 pb-2">Quick Links</h4>
                                <ul className="space-y-2 text-blue-700 font-bold text-sm">
                                    {['Project Forms', 'Research Policies', 'Industry Collaboration', 'IPR Cell', 'Faculty Directory'].map(link => (
                                        <li key={link}><a href="#" className="hover:underline decoration-2 flex items-center group"><span className="w-1 h-1 bg-blue-700 rounded-full mr-2 group:w-2 transition-all"></span>{link}</a></li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </aside>
                </div>
            </main>

            <footer id="contact" className="bg-zinc-900 text-white mt-20 border-t-4 border-gray-900">
                <div className="container mx-auto px-6 py-12">
                    <div className="grid md:grid-cols-3 gap-12">
                        <div>
                            <h3 className="text-xl font-bold mb-4 border-b-2 border-gray-700 pb-2 inline-block">R&D Office</h3>
                            <p className="text-zinc-400 dark:text-zinc-500 mb-1">Indian Institute of Technology Guwahati</p>
                            <p className="text-zinc-400 dark:text-zinc-500">Guwahati - 781039, Assam, India</p>
                        </div>
                        <div>
                            <h3 className="text-xl font-bold mb-4 border-b-2 border-gray-700 pb-2 inline-block">Contact</h3>
                            <p className="flex items-center text-zinc-300 dark:text-zinc-600 mb-2"><PhoneIcon className="w-4 h-4 mr-2" /> +91-361-258-XXXX</p>
                            <p className="flex items-center text-zinc-300 dark:text-zinc-600"><MailIcon className="w-4 h-4 mr-2" /> rnd-office@iitg.ac.in</p>
                        </div>
                        <div>
                            <h3 className="text-xl font-bold mb-4 border-b-2 border-gray-700 pb-2 inline-block">Social</h3>
                            <div className="flex space-x-4">
                                {['Twitter', 'LinkedIn', 'YouTube'].map(social => (
                                    <a key={social} href="#" className="text-zinc-400 dark:text-zinc-500 hover:text-white font-bold hover:underline">{social}</a>
                                ))}
                            </div>
                        </div>
                    </div>
                    <div className="border-t border-gray-800 mt-12 pt-8 text-center text-zinc-500 dark:text-zinc-400 text-sm font-medium">
                        <p>&copy; 2025 R&D, IIT Guwahati. All Rights Reserved.</p>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default LandingPage;