'use client';

import { useEffect, useState } from 'react';
import SwaggerUI from 'swagger-ui-react';
import 'swagger-ui-react/swagger-ui.css';

export default function DocsPage() {
    const [spec, setSpec] = useState(null);

    useEffect(() => {
        fetch('/api/docs-json')
            .then(res => res.json())
            .then(data => setSpec(data))
            .catch(err => console.error('Failed to load swagger documentation', err));
    }, []);

    if (!spec) return <div className="p-8 text-black dark:text-white">Loading API documentation...</div>;

    return (
        <div className="bg-white min-h-screen p-4">
            <SwaggerUI spec={spec} />
        </div>
    );
}
