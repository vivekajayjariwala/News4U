const config = {
    api: {
        baseUrl: process.env.REACT_APP_API_URL || 'http://localhost:3001',
        endpoints: {
            auth: '/api/auth',
            admin: '/api/admin',
            destinations: '/api/destinations',
            lists: '/api/lists',
            news: '/api/news',
            roadmaps: '/api/roadmaps',
            clippings: '/api/clippings',
            history: '/api/history',
            profile: '/api/profile',
            alerts: '/api/profile/alerts'  // added for alerts management
        }
    }
};

export default config; 