import React, { useEffect } from 'react';
import { useNavigate } from 'react-router';

const LandingPage: React.FC = () => {
    const navigate = useNavigate();

    useEffect(() => {
        // Mobile menu toggle
        const mobileMenuButton = document.getElementById('mobile-menu-button');
        const mobileMenu = document.getElementById('mobile-menu');
        
        const handleMenuToggle = () => {
            mobileMenu?.classList.toggle('hidden');
        };

        mobileMenuButton?.addEventListener('click', handleMenuToggle);

        // Smooth scrolling for anchor links
        const anchors = document.querySelectorAll('a[href^="#"]');
        const handleAnchorClick = function (this: HTMLAnchorElement, e: MouseEvent) {
            if (this.getAttribute('href') === '#') {
                return;
            }
            
            const targetId = this.getAttribute('href');
            if (targetId) {
                const targetElement = document.querySelector(targetId);
                if(targetElement) {
                    e.preventDefault();
                    targetElement.scrollIntoView({
                        behavior: 'smooth'
                    });
                }
            }
        };

        anchors.forEach(anchor => {
            anchor.addEventListener('click', handleAnchorClick as EventListener);
        });

        return () => {
            mobileMenuButton?.removeEventListener('click', handleMenuToggle);
            anchors.forEach(anchor => {
                anchor.removeEventListener('click', handleAnchorClick as EventListener);
            });
        };
    }, []);

    const handleLoginClick = () => {
        navigate('/login');
    };

    return (
        <div className="bg-gray-50 text-gray-800">
            {/* Header */}
            <header className="bg-white shadow-md sticky top-0 z-50">
                <div className="container mx-auto px-6 py-4 flex justify-between items-center">
                    <div className="flex items-center space-x-4">
                        <img src="/IITG_Logo.svg" alt="IITG Logo" className="h-12" />
                        <div>
                            <h1 className="text-xl font-bold text-gray-900">Research and Development</h1>
                            <p className="text-sm text-gray-600">Indian Institute of Technology Guwahati</p>
                        </div>
                    </div>
                    <nav className="hidden md:flex items-center space-x-6">
                        <a href="#about" className="text-gray-600 hover:text-blue-600 transition-colors">About</a>
                        <a href="#research" className="text-gray-600 hover:text-blue-600 transition-colors">Research</a>
                        <a href="#facilities" className="text-gray-600 hover:text-blue-600 transition-colors">Facilities</a>
                        <a href="#news" className="text-gray-600 hover:text-blue-600 transition-colors">News</a>
                        <button onClick={handleLoginClick} className="text-blue-600 border border-blue-600 px-4 py-2 rounded-md hover:bg-blue-600 hover:text-white transition-colors">Login</button>
                        <a href="#contact" className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors">Contact Us</a>
                    </nav>
                    <button className="md:hidden" id="mobile-menu-button">
                        <i className="fas fa-bars text-2xl text-gray-700"></i>
                    </button>
                </div>
                {/* Mobile Menu */}
                <div className="md:hidden hidden" id="mobile-menu">
                    <a href="#about" className="block py-2 px-4 text-sm hover:bg-gray-100">About</a>
                    <a href="#research" className="block py-2 px-4 text-sm hover:bg-gray-100">Research</a>
                    <a href="#facilities" className="block py-2 px-4 text-sm hover:bg-gray-100">Facilities</a>
                    <a href="#publications" className="block py-2 px-4 text-sm hover:bg-gray-100">Publications</a>
                    <a href="#events" className="block py-2 px-4 text-sm hover:bg-gray-100">Events</a>
                    <a href="#news" className="block py-2 px-4 text-sm hover:bg-gray-100">News</a>
                    <button onClick={handleLoginClick} className="block w-full text-left py-2 px-4 text-sm text-blue-600 hover:bg-blue-100">Login</button>
                    <a href="#contact" className="block py-2 px-4 text-sm bg-blue-600 text-white text-center rounded-b-md hover:bg-blue-700">Contact Us</a>
                </div>
            </header>

            {/* Hero Section */}
            <section 
                className="hero-section text-white" 
                style={{ background: "linear-gradient(rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.5)), url('https://placehold.co/1600x800/3b82f6/ffffff?text=IITG+Campus') no-repeat center center/cover" }}
            >
                <div className="container mx-auto px-6 py-32 text-center">
                    <h2 className="text-4xl md:text-6xl font-bold mb-4">Driving Innovation, Shaping the Future</h2>
                    <p className="text-lg md:text-xl max-w-3xl mx-auto mb-8">Fostering a culture of cutting-edge research and development to address global challenges and advance scientific knowledge.</p>
                    <a href="#research" className="bg-white text-blue-600 font-bold py-3 px-8 rounded-full hover:bg-gray-200 transition-transform transform hover:scale-105">Explore Our Research</a>
                </div>
            </section>

            <main className="container mx-auto px-6 py-12">

                {/* About R&D Section */}
                <section id="about" className="mb-16 scroll-mt-20">
                    <div className="grid md:grid-cols-2 gap-12 items-center">
                        <div>
                            <h2 className="text-3xl font-bold text-gray-900 mb-4">Welcome to R&D at IIT Guwahati</h2>
                            <p className="mb-4 text-lg">The Research and Development (R&D) section at IIT Guwahati is the central hub for overseeing and encouraging the institute's vibrant research activities. We are committed to fostering an environment that promotes high-impact, interdisciplinary research and innovation.</p>
                            <p className="mb-6">Our mission is to provide comprehensive support to faculty and students, manage sponsored research projects, facilitate collaborations, and ensure the highest standards of research integrity.</p>
                            <div className="flex space-x-4">
                                <div className="bg-blue-100 p-4 rounded-lg text-center flex-1">
                                    <p className="text-3xl font-bold text-blue-700">500+</p>
                                    <p className="text-sm text-blue-600">Ongoing Projects</p>
                                </div>
                                <div className="bg-green-100 p-4 rounded-lg text-center flex-1">
                                    <p className="text-3xl font-bold text-green-700">200+</p>
                                    <p className="text-sm text-green-600">Patents Filed</p>
                                </div>
                                <div className="bg-purple-100 p-4 rounded-lg text-center flex-1">
                                    <p className="text-3xl font-bold text-purple-700">₹500 Cr+</p>
                                    <p className="text-sm text-purple-600">External Funding</p>
                                </div>
                            </div>
                        </div>
                        <div className="rounded-lg overflow-hidden shadow-xl">
                            <img src="https://placehold.co/600x400/e2e8f0/334155?text=Research+Lab" alt="Research Lab" className="w-full h-full object-cover" />
                        </div>
                    </div>
                </section>

                {/* Research Areas Section */}
                <section id="research" className="mb-16 scroll-mt-20">
                    <h2 className="text-3xl font-bold text-center text-gray-900 mb-2">Our Research Areas</h2>
                    <p className="text-center text-lg text-gray-600 mb-10">Exploring the frontiers of science and technology.</p>
                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
                        <div className="bg-white p-6 rounded-lg shadow-lg hover:shadow-xl transition-shadow">
                            <div className="text-blue-500 mb-4"><i className="fas fa-microchip text-4xl"></i></div>
                            <h3 className="font-bold text-xl mb-2 text-blue-800">AI & Machine Learning</h3>
                            <p className="text-gray-600">Developing intelligent systems for data analysis, automation, and decision making.</p>
                        </div>
                        <div className="bg-white p-6 rounded-lg shadow-lg hover:shadow-xl transition-shadow">
                            <div className="text-green-500 mb-4"><i className="fas fa-dna text-4xl"></i></div>
                            <h3 className="font-bold text-xl mb-2 text-green-800">Biotechnology</h3>
                            <p className="text-gray-600">Innovating in healthcare, agriculture, and environmental science through genetic engineering.</p>
                        </div>
                        <div className="bg-white p-6 rounded-lg shadow-lg hover:shadow-xl transition-shadow">
                            <div className="text-red-500 mb-4"><i className="fas fa-atom text-4xl"></i></div>
                            <h3 className="font-bold text-xl mb-2 text-red-800">Advanced Materials</h3>
                            <p className="text-gray-600">Creating next-generation materials for electronics, energy, and aerospace applications.</p>
                        </div>
                        <div className="bg-white p-6 rounded-lg shadow-lg hover:shadow-xl transition-shadow">
                            <div className="text-yellow-500 mb-4"><i className="fas fa-solar-panel text-4xl"></i></div>
                            <h3 className="font-bold text-xl mb-2 text-yellow-800">Sustainable Energy</h3>
                            <p className="text-gray-600">Researching renewable energy sources and efficient energy storage solutions.</p>
                        </div>
                    </div>
                </section>
                
                {/* Facilities Section */}
                <section id="facilities" className="mb-16 scroll-mt-20">
                    <h2 className="text-3xl font-bold text-center text-gray-900 mb-2">State-of-the-Art Facilities</h2>
                    <p className="text-center text-lg text-gray-600 mb-10">Empowering research with world-class infrastructure.</p>
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                        <div className="bg-white p-6 rounded-lg shadow-lg text-center hover:shadow-xl transition-shadow">
                            <i className="fas fa-server text-4xl text-blue-500 mx-auto mb-4"></i>
                            <h3 className="font-bold text-xl mb-2">High-Performance Computing</h3>
                            <p className="text-gray-600">Access to supercomputing clusters for complex simulations and data analysis.</p>
                        </div>
                        <div className="bg-white p-6 rounded-lg shadow-lg text-center hover:shadow-xl transition-shadow">
                            <i className="fas fa-cogs text-4xl text-green-500 mx-auto mb-4"></i>
                            <h3 className="font-bold text-xl mb-2">Central Instruments Facility</h3>
                            <p className="text-gray-600">A comprehensive range of sophisticated analytical instruments.</p>
                        </div>
                        <div className="bg-white p-6 rounded-lg shadow-lg text-center hover:shadow-xl transition-shadow">
                            <i className="fas fa-flask text-4xl text-purple-500 mx-auto mb-4"></i>
                            <h3 className="font-bold text-xl mb-2">Nanotechnology Lab</h3>
                            <p className="text-gray-600">Advanced fabrication and characterization tools for nanoscale research.</p>
                        </div>
                    </div>
                </section>

                {/* Featured Publications Section */}
                <section id="publications" className="mb-16 scroll-mt-20">
                    <h2 className="text-3xl font-bold text-gray-900 mb-6">Featured Publications</h2>
                    <div className="space-y-6">
                        <div className="bg-white p-4 rounded-lg shadow-md hover:shadow-lg transition-shadow">
                            <h3 className="font-semibold text-lg text-blue-700">A Novel Approach to Water Purification Using Graphene Oxide Membranes</h3>
                            <p className="text-sm text-gray-600">A. Kumar, B. Sharma, et al. | <span className="italic">Journal of Membrane Science</span>, 2025</p>
                            <a href="#" className="text-sm text-blue-600 hover:underline mt-1 inline-block">Read More &rarr;</a>
                        </div>
                        <div className="bg-white p-4 rounded-lg shadow-md hover:shadow-lg transition-shadow">
                            <h3 className="font-semibold text-lg text-blue-700">Deep Learning for Early Diagnosis of Alzheimer's Disease from MRI Scans</h3>
                            <p className="text-sm text-gray-600">S. Das, P. Mehta, et al. | <span className="italic">Nature Medicine</span>, 2025</p>
                            <a href="#" className="text-sm text-blue-600 hover:underline mt-1 inline-block">Read More &rarr;</a>
                        </div>
                    </div>
                </section>
                
                {/* Events Section */}
                <section id="events" className="mb-16 scroll-mt-20">
                    <h2 className="text-3xl font-bold text-center text-gray-900 mb-10">Upcoming Events & Workshops</h2>
                    <div className="grid md:grid-cols-2 gap-8">
                        <div className="bg-white rounded-lg shadow-lg overflow-hidden flex items-center">
                            <div className="bg-blue-600 text-white text-center p-4">
                                <p className="text-xl font-bold">AUG</p>
                                <p className="text-4xl font-bold">15</p>
                            </div>
                            <div className="p-6">
                                <h3 className="font-bold text-xl mb-2">International Conference on Robotics and Automation</h3>
                                <p className="text-gray-600 mb-3">Join global experts to discuss the latest trends in robotics.</p>
                                <a href="#" className="font-semibold text-blue-600 hover:underline">Learn More</a>
                            </div>
                        </div>
                        <div className="bg-white rounded-lg shadow-lg overflow-hidden flex items-center">
                            <div className="bg-green-600 text-white text-center p-4">
                                <p className="text-xl font-bold">SEP</p>
                                <p className="text-4xl font-bold">05</p>
                            </div>
                            <div className="p-6">
                                <h3 className="font-bold text-xl mb-2">Workshop on Scientific Writing & Publishing</h3>
                                <p className="text-gray-600 mb-3">Enhance your academic writing skills with guidance from seasoned editors.</p>
                                <a href="#" className="font-semibold text-blue-600 hover:underline">Register Now</a>
                            </div>
                        </div>
                    </div>
                </section>

                {/* News & Updates Section */}
                <div className="grid lg:grid-cols-3 gap-12">
                    <section id="news" className="lg:col-span-2 scroll-mt-20">
                        <h2 className="text-3xl font-bold text-gray-900 mb-6">News & Highlights</h2>
                        <div className="space-y-8">
                            <div className="flex items-start space-x-4 bg-white p-4 rounded-lg shadow-md">
                                <div className="flex-shrink-0 w-24 h-24">
                                    <img src="https://placehold.co/100x100/34d399/ffffff?text=Event" alt="News Image" className="w-full h-full object-cover rounded-md" />
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500">July 25, 2025</p>
                                    <h3 className="font-semibold text-lg hover:text-blue-600"><a href="#">IITG researchers develop a new catalyst for green hydrogen production.</a></h3>
                                    <p className="text-gray-600 mt-1">A team led by Prof. John Doe has made a significant breakthrough in sustainable energy...</p>
                                </div>
                            </div>
                            <div className="flex items-start space-x-4 bg-white p-4 rounded-lg shadow-md">
                                <div className="flex-shrink-0 w-24 h-24">
                                    <img src="https://placehold.co/100x100/fbbf24/ffffff?text=Award" alt="News Image" className="w-full h-full object-cover rounded-md" />
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500">July 18, 2025</p>
                                    <h3 className="font-semibold text-lg hover:text-blue-600"><a href="#">Dr. Jane Smith receives the prestigious Young Scientist Award.</a></h3>
                                    <p className="text-gray-600 mt-1">Her work on nano-materials has been recognized for its potential impact on electronics...</p>
                                </div>
                            </div>
                        </div>
                        <div className="text-center mt-8">
                            <a href="#" className="text-blue-600 font-semibold hover:underline">View All News &rarr;</a>
                        </div>
                    </section>

                    <aside id="updates" className="scroll-mt-20">
                        <div className="bg-white p-6 rounded-lg shadow-lg sticky top-24">
                            <h3 className="text-2xl font-bold text-gray-900 mb-4">Updates & Links</h3>
                            <div className="mb-6">
                                <h4 className="font-semibold mb-3 text-gray-800 border-b pb-2">New Updates</h4>
                                <ul className="space-y-3 text-sm">
                                    <li className="hover:text-blue-600"><a href="#">Call for proposals: Interdisciplinary Research Grant 2025 <span className="text-red-500 font-semibold">(New)</span></a></li>
                                    <li className="hover:text-blue-600"><a href="#">Guidelines for project submission updated.</a></li>
                                    <li className="hover:text-blue-600"><a href="#">Upcoming workshop on Intellectual Property Rights.</a></li>
                                </ul>
                            </div>
                            <div>
                                <h4 className="font-semibold mb-3 text-gray-800 border-b pb-2">Quick Links</h4>
                                <ul className="space-y-2 text-blue-600">
                                <li><a href="#" className="hover:underline flex items-center"><i className="fas fa-file-alt mr-2"></i>Project Forms</a></li>
                                <li><a href="#" className="hover:underline flex items-center"><i className="fas fa-book-open mr-2"></i>Research Policies</a></li>
                                <li><a href="#" className="hover:underline flex items-center"><i className="fas fa-handshake mr-2"></i>Industry Collaboration</a></li>
                                <li><a href="#" className="hover:underline flex items-center"><i className="fas fa-lightbulb mr-2"></i>IPR Cell</a></li>
                                <li><a href="#" className="hover:underline flex items-center"><i className="fas fa-users mr-2"></i>Faculty Directory</a></li>
                                </ul>
                            </div>
                        </div>
                    </aside>
                </div>
            </main>

            <footer id="contact" className="bg-gray-800 text-white mt-16">
                <div className="container mx-auto px-6 py-12">
                    <div className="grid md:grid-cols-3 gap-8">
                        <div>
                            <h3 className="text-xl font-bold mb-4">R&D Office</h3>
                            <p className="mb-2">Indian Institute of Technology Guwahati</p>
                            <p>Guwahati - 781039, Assam, India</p>
                        </div>
                        <div>
                            <h3 className="text-xl font-bold mb-4">Contact Information</h3>
                            <p><i className="fas fa-phone-alt mr-2"></i>+91-361-258-XXXX</p>
                            <p><i className="fas fa-envelope mr-2"></i>rnd-office@iitg.ac.in</p>
                        </div>
                        <div>
                            <h3 className="text-xl font-bold mb-4">Follow Us</h3>
                            <div className="flex space-x-4">
                                <a href="#" className="text-gray-400 hover:text-white"><i className="fab fa-twitter fa-2x"></i></a>
                                <a href="#" className="text-gray-400 hover:text-white"><i className="fab fa-linkedin-in fa-2x"></i></a>
                                <a href="#" className="text-gray-400 hover:text-white"><i className="fab fa-youtube fa-2x"></i></a>
                            </div>
                        </div>
                    </div>
                    <div className="border-t border-gray-700 mt-8 pt-6 text-center text-gray-500 text-sm">
                        <p>&copy; 2025 R&D, IIT Guwahati. All Rights Reserved.</p>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default LandingPage;