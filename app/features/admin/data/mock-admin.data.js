/**
 * Mock Admin Data
 * Mock data for students, companies, and campuses
 * This file contains test data for development and testing purposes
 */
angular.module('campusApp.admin').constant('MOCK_ADMIN_DATA', {
    students: [
        {
            id: 1,
            name: 'John Smith',
            email: 'john.smith@student.edu',
            image: 'https://i.pravatar.cc/150?img=1',
            campusName: 'Mangalore University',
            campusId: 1,
            studentId: 'STU001',
            course: 'BCA',
            batch: '2024',
            phone: '+91 9876543210'
        },
        {
            id: 2,
            name: 'Sarah Johnson',
            email: 'sarah.johnson@student.edu',
            image: 'https://i.pravatar.cc/150?img=5',
            campusName: 'Bangalore University',
            campusId: 2,
            studentId: 'STU002',
            course: 'MCA',
            batch: '2024',
            phone: '+91 9876543211'
        },
        {
            id: 3,
            name: 'Michael Chen',
            email: 'michael.chen@student.edu',
            image: 'https://i.pravatar.cc/150?img=12',
            campusName: 'Mangalore University',
            campusId: 1,
            studentId: 'STU003',
            course: 'BSc Computer Science',
            batch: '2023',
            phone: '+91 9876543212'
        },
        {
            id: 4,
            name: 'Emily Davis',
            email: 'emily.davis@student.edu',
            image: 'https://i.pravatar.cc/150?img=9',
            campusName: 'Mysore University',
            campusId: 3,
            studentId: 'STU004',
            course: 'BBA',
            batch: '2024',
            phone: '+91 9876543213'
        },
        {
            id: 5,
            name: 'David Wilson',
            email: 'david.wilson@student.edu',
            image: 'https://i.pravatar.cc/150?img=15',
            campusName: 'Bangalore University',
            campusId: 2,
            studentId: 'STU005',
            course: 'MBA',
            batch: '2023',
            phone: '+91 9876543214'
        },
        {
            id: 6,
            name: 'Priya Patel',
            email: 'priya.patel@student.edu',
            image: 'https://i.pravatar.cc/150?img=20',
            campusName: 'Mangalore University',
            campusId: 1,
            studentId: 'STU006',
            course: 'BCA',
            batch: '2024',
            phone: '+91 9876543215'
        },
        {
            id: 7,
            name: 'Rajesh Kumar',
            email: 'rajesh.kumar@student.edu',
            image: 'https://i.pravatar.cc/150?img=33',
            campusName: 'Mysore University',
            campusId: 3,
            studentId: 'STU007',
            course: 'BSc Mathematics',
            batch: '2023',
            phone: '+91 9876543216'
        },
        {
            id: 8,
            name: 'Lisa Anderson',
            email: 'lisa.anderson@student.edu',
            image: 'https://i.pravatar.cc/150?img=47',
            campusName: 'Bangalore University',
            campusId: 2,
            studentId: 'STU008',
            course: 'MCA',
            batch: '2024',
            phone: '+91 9876543217'
        },
        {
            id: 9,
            name: 'Amit Sharma',
            email: 'amit.sharma@student.edu',
            image: 'https://i.pravatar.cc/150?img=51',
            campusName: 'Mangalore University',
            campusId: 1,
            studentId: 'STU009',
            course: 'BBA',
            batch: '2024',
            phone: '+91 9876543218'
        },
        {
            id: 10,
            name: 'Jessica Brown',
            email: 'jessica.brown@student.edu',
            image: 'https://i.pravatar.cc/150?img=45',
            campusName: 'Mysore University',
            campusId: 3,
            studentId: 'STU010',
            course: 'BSc Computer Science',
            batch: '2023',
            phone: '+91 9876543219'
        },
        {
            id: 11,
            name: 'Rahul Verma',
            email: 'rahul.verma@student.edu',
            image: 'https://i.pravatar.cc/150?img=52',
            campusName: 'Bangalore University',
            campusId: 2,
            studentId: 'STU011',
            course: 'MBA',
            batch: '2024',
            phone: '+91 9876543220'
        },
        {
            id: 12,
            name: 'Sophie Martin',
            email: 'sophie.martin@student.edu',
            image: 'https://i.pravatar.cc/150?img=24',
            campusName: 'Mangalore University',
            campusId: 1,
            studentId: 'STU012',
            course: 'BCA',
            batch: '2023',
            phone: '+91 9876543221'
        }
    ],
    campuses: [
        {
            id: 1,
            name: 'Mangalore University',
            image: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=400&h=300&fit=crop',
            location: 'Mangalore, Karnataka',
            established: '1980',
            description:
                'A premier university offering various undergraduate and postgraduate programs',
            totalStudents: 5000,
            totalCourses: 25
        },
        {
            id: 2,
            name: 'Bangalore University',
            image: 'https://images.unsplash.com/photo-1562774053-701939374585?w=400&h=300&fit=crop',
            location: 'Bangalore, Karnataka',
            established: '1964',
            description: 'One of the oldest and most prestigious universities in Karnataka',
            totalStudents: 8000,
            totalCourses: 35
        },
        {
            id: 3,
            name: 'Mysore University',
            image: 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=400&h=300&fit=crop',
            location: 'Mysore, Karnataka',
            established: '1916',
            description: 'A historic university known for excellence in education and research',
            totalStudents: 6000,
            totalCourses: 30
        },
        {
            id: 4,
            name: 'Manipal University',
            image: 'https://images.unsplash.com/photo-1509062522246-3755977927d7?w=400&h=300&fit=crop',
            location: 'Manipal, Karnataka',
            established: '1953',
            description: 'A leading private university with world-class infrastructure',
            totalStudents: 10000,
            totalCourses: 50
        },
        {
            id: 5,
            name: 'Christ University',
            image: 'https://images.unsplash.com/photo-1498243691581-b145c3f54a5a?w=400&h=300&fit=crop',
            location: 'Bangalore, Karnataka',
            established: '1969',
            description: 'A deemed university known for quality education and holistic development',
            totalStudents: 7000,
            totalCourses: 40
        },
        {
            id: 6,
            name: 'NITK Surathkal',
            image: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=400&h=300&fit=crop',
            location: 'Surathkal, Karnataka',
            established: '1960',
            description: 'National Institute of Technology known for engineering excellence',
            totalStudents: 4000,
            totalCourses: 20
        }
    ],
    companies: [
        {
            id: 1,
            name: 'Tech Solutions Inc.',
            image: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=400&h=300&fit=crop',
            industry: 'Information Technology',
            location: 'Bangalore, Karnataka',
            website: 'www.techsolutions.com',
            description: 'Leading IT solutions provider specializing in enterprise software',
            totalEmployees: 500,
            established: '2010'
        },
        {
            id: 2,
            name: 'Global Software Services',
            image: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=400&h=300&fit=crop',
            industry: 'Software Development',
            location: 'Mumbai, Maharashtra',
            website: 'www.globalsoft.com',
            description: 'Premier software development company with global presence',
            totalEmployees: 1200,
            established: '2005'
        },
        {
            id: 3,
            name: 'Digital Innovations Pvt Ltd',
            image: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400&h=300&fit=crop',
            industry: 'Digital Marketing',
            location: 'Delhi, NCR',
            website: 'www.digitalinnovations.com',
            description: 'Innovative digital marketing and web solutions company',
            totalEmployees: 300,
            established: '2015'
        },
        {
            id: 4,
            name: 'CloudTech Systems',
            image: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=400&h=300&fit=crop',
            industry: 'Cloud Computing',
            location: 'Hyderabad, Telangana',
            website: 'www.cloudtech.com',
            description: 'Enterprise cloud solutions and infrastructure services',
            totalEmployees: 800,
            established: '2012'
        },
        {
            id: 5,
            name: 'Data Analytics Corp',
            image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=400&h=300&fit=crop',
            industry: 'Data Analytics',
            location: 'Pune, Maharashtra',
            website: 'www.dataanalytics.com',
            description: 'Advanced data analytics and business intelligence solutions',
            totalEmployees: 450,
            established: '2013'
        },
        {
            id: 6,
            name: 'FinTech Solutions',
            image: 'https://images.unsplash.com/photo-1553729459-efe14ef6055d?w=400&h=300&fit=crop',
            industry: 'Financial Technology',
            location: 'Chennai, Tamil Nadu',
            website: 'www.fintechsolutions.com',
            description: 'Cutting-edge financial technology and payment solutions',
            totalEmployees: 600,
            established: '2011'
        },
        {
            id: 7,
            name: 'AI Innovations Ltd',
            image: 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=400&h=300&fit=crop',
            industry: 'Artificial Intelligence',
            location: 'Bangalore, Karnataka',
            website: 'www.aiinnovations.com',
            description: 'Pioneering AI and machine learning solutions',
            totalEmployees: 350,
            established: '2018'
        },
        {
            id: 8,
            name: 'CyberSecure Systems',
            image: 'https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=400&h=300&fit=crop',
            industry: 'Cybersecurity',
            location: 'Gurgaon, Haryana',
            website: 'www.cybersecure.com',
            description: 'Enterprise cybersecurity and threat protection services',
            totalEmployees: 250,
            established: '2016'
        }
    ],
    // Helper function to get students with pagination
    getStudents: function (params) {
        const page = params && params.page ? params.page : 1;
        const limit = params && params.limit ? params.limit : 9;
        const start = (page - 1) * limit;
        const end = start + limit;
        const students = this.students.slice(start, end);

        return {
            data: students,
            totalPages: Math.ceil(this.students.length / limit),
            currentPage: page,
            total: this.students.length
        };
    },
    // Helper function to get campuses with pagination
    getCampuses: function (params) {
        const page = params && params.page ? params.page : 1;
        const limit = params && params.limit ? params.limit : 9;
        const start = (page - 1) * limit;
        const end = start + limit;
        const campuses = this.campuses.slice(start, end);

        return {
            data: campuses,
            totalPages: Math.ceil(this.campuses.length / limit),
            currentPage: page,
            total: this.campuses.length
        };
    },
    // Helper function to get companies with pagination
    getCompanies: function (params) {
        const page = params && params.page ? params.page : 1;
        const limit = params && params.limit ? params.limit : 9;
        const start = (page - 1) * limit;
        const end = start + limit;
        const companies = this.companies.slice(start, end);

        return {
            data: companies,
            totalPages: Math.ceil(this.companies.length / limit),
            currentPage: page,
            total: this.companies.length
        };
    }
});
