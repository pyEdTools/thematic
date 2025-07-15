import { useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import axios from 'axios';

export default function ResultsPage() {
    const { public_id } = useParams();
    const [clusters, setClusters] = useState({});

    useEffect(() => {
        axios.get(`/api/submission/${public_id}/results`)
            .then(res => setClusters(res.data.results))
            .catch(err => console.error("Failed to load clustering results:", err));
    }, [public_id]);

    return (
        <div className="container mt-5">
            <h3 className="mb-4">Clustering Results</h3>
            {Object.entries(clusters).map(([theme, words], idx) => (
                <div key={idx} className="mb-4">
                    <h5 className="text-primary">{theme}</h5>
                    <ul className="list-group">
                        {words.map((word, i) => (
                            <li key={i} className="list-group-item">{word}</li>
                        ))}
                    </ul>
                </div>
            ))}
        </div>
    );
}
