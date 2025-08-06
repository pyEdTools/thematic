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
            <div className="card border rounded-3 shadow-sm mb-3">
                <div className="card-body p-0">
                    <table className="table align-middle mb-0">
                        <thead
                            style={{
                                background: 'linear-gradient(90deg, #1d4ed8 0%, #facc15 100%)',
                                color: 'white',
                                fontWeight: 600,
                            }}
                        >
                            <tr>
                                <th style={{ width: '30%' }} className="px-3 py-3 rounded-top-start">Theme</th>
                                <th className="px-3 py-3">Seed Words</th>
                                <th style={{ width: '5%' }} className="px-3 py-3 rounded-top-end"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {themes.map((theme, i) => (
                                <tr
                                    key={i}
                                    className="align-middle"
                                    style={{
                                        transition: 'all 0.2s ease',
                                    }}
                                    onMouseEnter={(e) =>
                                        (e.currentTarget.style.boxShadow = '0 2px 6px rgba(0,0,0,0.08)')
                                    }
                                    onMouseLeave={(e) =>
                                        (e.currentTarget.style.boxShadow = 'none')
                                    }
                                >
                                    {/* Theme Input */}
                                    <td className="px-3 py-2">
                                        <input
                                            className="form-control form-control-sm rounded-pill"
                                            placeholder="e.g. collaboration"
                                            value={theme}
                                            onChange={(e) => updateTheme(i, e.target.value)}
                                        />
                                    </td>

                                    {/* Seed Words Input + Chips */}
                                    <td className="px-3 py-2">
                                        <div className="d-flex flex-column gap-1">
                                            <div className="d-flex align-items-center gap-2">
                                                <input
                                                    className="form-control form-control-sm rounded-pill"
                                                    placeholder="e.g. teamwork, shared goals"
                                                    value={seeds[i]}
                                                    onChange={(e) => updateSeed(i, e.target.value)}
                                                />
                                                <button
                                                    className="btn btn-sm btn-outline-light text-dark border-secondary"
                                                    onClick={() => suggestSeedWords(i)}
                                                    disabled={!themes[i] || loadingIdx === i}
                                                    type="button"
                                                    style={{
                                                        backgroundColor: '#f8f9fa',
                                                        borderRadius: '999px',
                                                    }}
                                                >
                                                    {loadingIdx === i ? (
                                                        <Spinner size="sm" animation="border" />
                                                    ) : (
                                                        'Suggest'
                                                    )}
                                                </button>
                                            </div>

                                            {/* Chips Preview */}
                                            <div className="d-flex flex-wrap gap-1 mt-1">
                                                {seeds[i]
                                                    .split(',')
                                                    .map((seed) => seed.trim())
                                                    .filter((s) => s)
                                                    .map((seedWord, idx) => (
                                                        <span
                                                            key={idx}
                                                            style={{
                                                                backgroundColor: '#e0e7ff',
                                                                color: '#1e3a8a',
                                                                padding: '0.2rem 0.6rem',
                                                                fontSize: '0.75rem',
                                                                borderRadius: '999px',
                                                                fontWeight: 500,
                                                            }}
                                                        >
                                                            {seedWord}
                                                        </span>
                                                    ))}
                                            </div>
                                        </div>
                                    </td>

                                    {/* Remove Button */}
                                    <td className="px-3 py-2 text-center">
                                        <button
                                            className="btn btn-sm border-0 text-danger"
                                            style={{
                                                fontSize: '1.2rem',
                                                lineHeight: '1',
                                                transition: 'transform 0.2s ease, color 0.2s ease',
                                            }}
                                            onMouseEnter={(e) => {
                                                e.currentTarget.style.transform = 'scale(1.2)';
                                                e.currentTarget.style.color = '#dc2626';
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.transform = 'scale(1)';
                                                e.currentTarget.style.color = '#dc3545';
                                            }}
                                            onClick={() => removeTheme(i)}
                                        >
                                            ×
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <button
                className="btn btn-outline-primary rounded-pill"
                onClick={addTheme}
                disabled={themes.length >= 5}
            >
                + Add Theme
            </button>
        </>
    );

}
