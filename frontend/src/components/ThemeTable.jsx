// /components/ThemeSeedTable.jsx
import axios from 'axios';
import { Spinner } from 'react-bootstrap';
import { useState } from 'react';






export default function ThemeSeedTable({ themes, setThemes, seeds, setSeeds }) {
    const [loadingIdx, setLoadingIdx] = useState(null);

    const suggestSeedWords = async (idx) => {
        const theme = themes[idx];
        if (!theme) return;

        try {
            setLoadingIdx(idx);
            const res = await axios.post('/api/suggest_seeds', { theme });
            const suggested = res.data.seeds.join(', ');
            updateSeed(idx, suggested);
        } catch (err) {
            console.error("Failed to fetch suggested seeds:", err);
        } finally {
            setLoadingIdx(null);
        }
    };

    const updateTheme = (idx, val) => {
        const copy = [...themes];
        copy[idx] = val;
        setThemes(copy);
    };

    const updateSeed = (idx, val) => {
        const copy = [...seeds];
        copy[idx] = val;
        setSeeds(copy);
    };

    const addTheme = () => {
        setThemes([...themes, '']);
        setSeeds([...seeds, '']);
    };

    const removeTheme = (idx) => {
        const t = [...themes];
        const s = [...seeds];
        t.splice(idx, 1);
        s.splice(idx, 1);
        setThemes(t);
        setSeeds(s);
    };

    return (
        <>
            <table className="table table-bordered align-middle">
                <thead className="table-light">
                    <tr>
                        <th style={{ width: '30%' }}>Theme</th>
                        <th>Seed Words (comma-separated)</th>
                        <th style={{ width: '5%' }}></th>
                    </tr>
                </thead>
                <tbody>
                    {themes.map((theme, i) => (
                        <tr key={i}>
                            <td>
                                <input
                                    className="form-control"
                                    placeholder="e.g. collaboration"
                                    value={theme}
                                    onChange={(e) => updateTheme(i, e.target.value)}
                                />
                            </td>
                            <td>
                                <div className="d-flex align-items-center gap-2">
                                    <input
                                        className="form-control"
                                        placeholder="e.g. teamwork, shared goals"
                                        value={seeds[i]}
                                        onChange={(e) => updateSeed(i, e.target.value)}
                                    />
                                    <button
                                        className="btn btn-sm btn-outline-secondary"
                                        onClick={() => suggestSeedWords(i)}
                                        disabled={!themes[i] || loadingIdx === i}
                                        type="button"
                                    >
                                        {loadingIdx === i ? (
                                            <Spinner size="sm" animation="border" />
                                        ) : (
                                            'Suggest'
                                        )}
                                    </button>
                                </div>
                            </td>

                            <td>
                                <button
                                    className="btn btn-sm btn-outline-danger"
                                    onClick={() => removeTheme(i)}
                                >
                                    ×
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
            <button className="btn btn-outline-primary" onClick={addTheme} disabled={themes.length >= 5}>
                + Add Theme
            </button>
        </>
    );
}
